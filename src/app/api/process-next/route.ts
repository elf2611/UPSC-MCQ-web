// src/app/api/process-next/route.ts
//
// Finds ONE waiting processing_jobs row, atomically claims it (so two
// concurrent callers can never grab the same job), processes it via
// chunk-processor.ts, and returns a result describing exactly what happened.
//
// Every branch logs a distinct, greppable event_type so Vercel Runtime Logs
// tell you the truth about what this call actually did.

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { verifyAdminToken } from '@/lib/auth-verify';
import { handleApiError } from '@/lib/logger';
import { processChunk } from '@/lib/chunk-processor';

export const maxDuration = 60;
export const dynamic = 'force-dynamic';

function log(event_type: string, details: Record<string, unknown> = {}) {
  console.log(JSON.stringify({
    timestamp: new Date().toISOString(),
    route: '/api/process-next',
    event_type,
    ...details,
  }));
}

export async function POST(request: NextRequest) {
  try {
    // 1. Auth
    const authResult = await verifyAdminToken(request);
    if (!authResult.ok) {
      log('auth_failed', { error: authResult.error });
      return NextResponse.json(
        { error: authResult.error },
        { status: authResult.status }
      );
    }

    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    // Optional uploadId passed from client
    let uploadId = undefined;
    try {
      const body = await request.json();
      uploadId = body.uploadId;
    } catch {
      // Body is optional
    }

    // 2. Find ONE candidate waiting job (oldest first).
    // This SELECT does not claim anything by itself — it's just a candidate.
    let query = supabaseAdmin
      .from('processing_jobs')
      .select('id, upload_id, source_file, chunk_start_page, chunk_end_page, status')
      .eq('status', 'waiting');

    if (uploadId) {
      query = query.eq('upload_id', uploadId);
    }
    
    query = query.order('created_at', { ascending: true }).limit(1);

    const { data: candidates, error: findError } = await query;

    if (findError) {
      log('find_query_failed', { error: findError.message, details: findError.details, hint: findError.hint });
      return NextResponse.json({ success: false, reason: 'find_query_failed', detail: findError.message }, { status: 500 });
    }

    if (!candidates || candidates.length === 0) {
      log('no_waiting_jobs_found');
      return NextResponse.json({ success: true, claimed: false, reason: 'no_waiting_jobs' });
    }

    const candidate = candidates[0];
    log('candidate_found', { jobId: candidate.id, uploadId: candidate.upload_id, pages: `${candidate.chunk_start_page}-${candidate.chunk_end_page}` });

    // 3. ATOMIC CLAIM: update status waiting -> processing, but ONLY if it's
    // still 'waiting' at the moment of the update. If another request beat us
    // to it, .eq('status', 'waiting') will match zero rows and we back off.
    const { data: claimed, error: claimError } = await supabaseAdmin
      .from('processing_jobs')
      .update({ status: 'processing', status_message: 'Claimed, starting extraction...', updated_at: new Date().toISOString() })
      .eq('id', candidate.id)
      .eq('status', 'waiting') // <-- this is the race-condition guard
      .select('id, upload_id, source_file, chunk_start_page, chunk_end_page');

    if (claimError) {
      log('claim_update_failed', { jobId: candidate.id, error: claimError.message, details: claimError.details, hint: claimError.hint });
      return NextResponse.json({ success: false, reason: 'claim_update_failed', detail: claimError.message }, { status: 500 });
    }

    if (!claimed || claimed.length === 0) {
      // Someone else claimed it between our SELECT and UPDATE. Not an error.
      log('claim_lost_race', { jobId: candidate.id });
      return NextResponse.json({ success: true, claimed: false, reason: 'lost_race_to_another_caller' });
    }

    const job = claimed[0];
    log('claim_succeeded', { jobId: job.id });

    // 4. Actually process the chunk. This is wrapped so that no matter what
    // happens inside, the job never ends this request still stuck in
    // 'processing' with no explanation.
    try {
      const result = await processChunk({
        jobId: job.id,
        uploadId: job.upload_id,
        sourceFile: job.source_file,
        startPage: job.chunk_start_page,
        endPage: job.chunk_end_page,
        supabaseAdmin,
        onStatus: (msg: string) => log('status_update', { jobId: job.id, message: msg }),
      });

      log('processing_completed', { jobId: job.id, questionsGenerated: result.questionsGenerated });

      return NextResponse.json({
        success: true,
        claimed: true,
        jobId: job.id,
        status: 'completed',
        questionsGenerated: result.questionsGenerated,
      });

    } catch (processErr: unknown) {
      const errMsg = processErr instanceof Error ? processErr.message : String(processErr);
      log('processing_threw', { jobId: job.id, error: errMsg });

      // GUARANTEE the job is marked failed, not left hanging in 'processing'
      await supabaseAdmin
        .from('processing_jobs')
        .update({
          status: 'failed',
          error_message: errMsg,
          status_message: 'Failed',
          updated_at: new Date().toISOString(),
        })
        .eq('id', job.id);

      return NextResponse.json({
        success: true, // the API call itself succeeded; the JOB failed
        claimed: true,
        jobId: job.id,
        status: 'failed',
        error: errMsg,
      });
    }

  } catch (err: unknown) {
    log('unhandled_error', { error: err instanceof Error ? err.message : String(err) });
    const errorResponse = handleApiError('/api/process-next', err);
    return NextResponse.json(errorResponse, { status: 500 });
  }
}
