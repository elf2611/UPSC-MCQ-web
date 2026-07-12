import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');
    const uploadId = searchParams.get('uploadId');

    if (!userId) {
      return NextResponse.json({ error: 'User ID is required' }, { status: 400 });
    }

    // Verify admin role
    const { data: profile, error: profileError } = await supabaseAdmin
      .from('profiles')
      .select('role')
      .eq('id', userId)
      .single();

    if (profileError || !profile || profile.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized.' }, { status: 403 });
    }

    let query = supabaseAdmin
      .from('processing_jobs')
      .select('id, upload_id, chunk_start_page, chunk_end_page, status, status_message, questions_generated, error_message')
      .order('chunk_start_page', { ascending: true });

    if (uploadId) {
      query = query.eq('upload_id', uploadId);
    } else {
      // If no uploadId specified, return only jobs that belong to active uploads (status != completed)
      // Actually, just return recent jobs
      query = query.order('created_at', { ascending: false }).limit(100);
    }

    const { data: jobs, error: jobsError } = await query;

    if (jobsError) {
      throw new Error(`Failed to fetch jobs: ${jobsError.message}`);
    }

    return NextResponse.json({ jobs });
  } catch (error: unknown) {
    console.error('Fetch jobs error:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json(
      { error: `Failed to fetch jobs: ${message}` },
      { status: 500 }
    );
  }
}
