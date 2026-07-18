import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/auth-verify';
import { verifyAdminToken } from '@/lib/auth-verify';



export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const supabaseAdmin = getSupabaseAdmin();
  try {
    // 1. Verify admin via Firebase ID token
    const authResult = await verifyAdminToken(request);
    if (!authResult.ok) {
      return NextResponse.json(
        {
          error: authResult.error,
          detail: process.env.NODE_ENV === 'development' ? authResult.detail : undefined,
        },
        { status: authResult.status }
      );
    }

    const { searchParams } = new URL(request.url);
    const uploadId = searchParams.get('uploadId');

    let query = supabaseAdmin
      .from('processing_jobs')
      .select('id, upload_id, chunk_start_page, chunk_end_page, status, status_message, questions_generated, error_message')
      .order('chunk_start_page', { ascending: true });

    if (uploadId) {
      query = query.eq('upload_id', uploadId);
    } else {
      query = query.order('created_at', { ascending: false }).limit(100);
    }

    const { data: jobs, error: jobsError } = await query;

    if (jobsError) {
      throw new Error(`Failed to fetch jobs: ${jobsError.message}`);
    }

    return NextResponse.json({ jobs });
  } catch (error: unknown) {
    console.error('[jobs-status] Fetch jobs error:', error);
    const message = error instanceof Error ? error.message : String(error);
    return NextResponse.json(
      { error: `Failed to fetch jobs: ${message}` },
      { status: 500 }
    );
  }
}
