import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { verifyAdminToken } from '@/lib/auth-verify';
import { processChunk } from '@/lib/chunk-processor';
import { GenerateRequestConfig } from '@/lib/ai/types';

export const maxDuration = 60;
export const dynamic = 'force-dynamic';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(request: NextRequest) {
  try {
    // 1. Verify admin via Firebase ID token
    const authResult = await verifyAdminToken(request);
    if (!authResult.ok) {
      console.log(`[process-next] Auth failed: ${authResult.error}`);
      return NextResponse.json(
        { error: authResult.error },
        { status: authResult.status }
      );
    }
    const userId = authResult.uid;

    // Optional config passed from client
    let config: Partial<GenerateRequestConfig> | undefined = undefined;
    try {
      const body = await request.json();
      config = body.config;
    } catch {
      // Body is optional - no-op
    }

    // 2. Find the oldest waiting job
    const { data: jobs, error: findError } = await supabaseAdmin
      .from('processing_jobs')
      .select('id')
      .eq('status', 'waiting')
      .order('created_at', { ascending: true })
      .limit(1);

    if (findError) {
      console.error(`[process-next] DB query failed: code=${findError.code} msg=${findError.message} detail=${findError.details}`);
      return NextResponse.json({ error: 'Failed to query waiting jobs.', detail: findError.message }, { status: 500 });
    }

    if (!jobs || jobs.length === 0) {
      console.log('[process-next] BRANCH: No waiting jobs found in DB. Stopping loop.');
      return NextResponse.json({ message: 'No waiting jobs found.' }, { status: 200 });
    }

    const jobId = jobs[0].id;
    console.log(`[process-next] BRANCH: Found waiting job id=${jobId}. Attempting atomic claim...`);

    // 3. Atomically claim the job.
    // CRITICAL: Do NOT use .single() — it throws a PGRST116 error if 0 rows are affected,
    // which is a normal race-condition outcome. Use .select() and check array length instead.
    const { data: claimedRows, error: claimError } = await supabaseAdmin
      .from('processing_jobs')
      .update({ status: 'processing', status_message: 'Starting job...' })
      .eq('id', jobId)
      .eq('status', 'waiting')  // Atomic lock: only updates if still 'waiting'
      .select('id');

    if (claimError) {
      console.error(`[process-next] BRANCH: Atomic claim UPDATE failed for job id=${jobId}: code=${claimError.code} msg=${claimError.message} detail=${claimError.details} hint=${claimError.hint}`);
      return NextResponse.json({ error: 'Failed to claim job.', detail: claimError.message }, { status: 500 });
    }

    if (!claimedRows || claimedRows.length === 0) {
      console.log(`[process-next] BRANCH: Claim returned 0 rows for job id=${jobId} — another worker grabbed it. Returning 202.`);
      return NextResponse.json({ message: 'Job was claimed by another worker. Try again.' }, { status: 202 });
    }

    console.log(`[process-next] BRANCH: Successfully claimed job id=${jobId}. Starting chunk-processor...`);

    // 4. Process the claimed chunk
    try {
      const result = await processChunk(supabaseAdmin, jobId, userId, config);
      console.log(`[process-next] BRANCH: chunk-processor completed for job id=${jobId}. questions=${result.questionsGenerated} dupes=${result.duplicatesSkipped} rejected=${result.rejected}`);
      return NextResponse.json(result);
    } catch (processErr: unknown) {
      const msg = processErr instanceof Error ? processErr.message : String(processErr);
      console.error(`[process-next] BRANCH: chunk-processor threw for job id=${jobId}: ${msg}`);
      return NextResponse.json({ error: msg }, { status: 500 });
    }

  } catch (error: unknown) {
    console.error('[process-next] UNHANDLED top-level error:', error);
    return NextResponse.json(
      { error: 'Internal server error', detail: String(error) },
      { status: 500 }
    );
  }
}
