import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { verifyAdminToken } from '@/lib/auth-verify';
import { processChunk } from '@/lib/chunk-processor';

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
      return NextResponse.json(
        { error: authResult.error },
        { status: authResult.status }
      );
    }
    const userId = authResult.uid;

    // Optional config can still be passed from client
    let config = undefined;
    try {
      const body = await request.json();
      config = body.config;
    } catch {
      // Body is optional
    }

    // 2. Atomically claim ONE waiting job using an optimistic lock
    // First, find the oldest waiting job
    const { data: jobs, error: findError } = await supabaseAdmin
      .from('processing_jobs')
      .select('id')
      .eq('status', 'waiting')
      .order('created_at', { ascending: true })
      .limit(1);

    if (findError) {
      return NextResponse.json({ error: 'Failed to query waiting jobs.' }, { status: 500 });
    }

    if (!jobs || jobs.length === 0) {
      return NextResponse.json({ message: 'No waiting jobs found.' }, { status: 200 });
    }

    const jobId = jobs[0].id;

    // 3. Claim the job by strictly updating it ONLY if its status is still 'waiting'
    const { data: claimedJob, error: claimError } = await supabaseAdmin
      .from('processing_jobs')
      .update({ 
        status: 'processing', 
        status_message: 'Starting job...',
        updated_at: new Date().toISOString() 
      })
      .eq('id', jobId)
      .eq('status', 'waiting') // The critical concurrency lock
      .select('id')
      .single();

    if (claimError || !claimedJob) {
      // Another worker/tab grabbed it first, or it's no longer waiting. 
      // Return 202 Accepted meaning "retry later/immediately".
      return NextResponse.json({ message: 'Job was claimed by another worker. Try again.' }, { status: 202 });
    }

    // 4. Process the claimed chunk
    try {
      const result = await processChunk(supabaseAdmin, jobId, userId, config);
      return NextResponse.json(result);
    } catch (processErr: unknown) {
      const msg = processErr instanceof Error ? processErr.message : String(processErr);
      return NextResponse.json({ error: msg }, { status: 500 });
    }

  } catch (error: unknown) {
    console.error('[process-next] Unhandled error:', error);
    return NextResponse.json(
      { error: 'Internal server error', detail: String(error) },
      { status: 500 }
    );
  }
}
