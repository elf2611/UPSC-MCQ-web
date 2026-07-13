import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { handleApiError } from '@/lib/logger';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');

    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { data: profile } = await supabaseAdmin
      .from('profiles')
      .select('role, email')
      .eq('id', userId)
      .single();

    if (!profile || (profile.role !== 'admin' && profile.email !== 'admin@prepwise.com')) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Run aggregate queries concurrently for speed
    const [
      questionsCount,
      subjectsCount,
      topicsCount,
      activeJobs,
      recentUploads,
      failedUploads,
      jobStats30Days,
    ] = await Promise.all([
      supabaseAdmin.from('questions').select('*', { count: 'exact', head: true }),
      supabaseAdmin.from('subjects').select('*', { count: 'exact', head: true }),
      supabaseAdmin.from('topics').select('*', { count: 'exact', head: true }),
      supabaseAdmin.from('processing_jobs').select('*').in('status', ['waiting', 'processing']),
      supabaseAdmin.from('processing_jobs').select('*').order('created_at', { ascending: false }).limit(10),
      supabaseAdmin.from('processing_jobs').select('*').eq('status', 'failed').order('created_at', { ascending: false }).limit(10),
      // 30 days stats
      supabaseAdmin.from('processing_jobs')
        .select('status, created_at, updated_at')
        .gte('created_at', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString())
    ]);

    // Calculate today's uploads
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayUploads = jobStats30Days.data?.filter(j => new Date(j.created_at) >= today).length || 0;

    // Calculate Success Rate & Avg Processing Time
    const jobs = jobStats30Days.data || [];
    const completedJobs = jobs.filter(j => j.status === 'completed');
    const successRate = jobs.length > 0 ? Math.round((completedJobs.length / jobs.length) * 100) : 0;

    let avgProcessingTimeSec = 0;
    if (completedJobs.length > 0) {
      const totalTimeMs = completedJobs.reduce((acc, job) => {
        const start = new Date(job.created_at).getTime();
        const end = new Date(job.updated_at).getTime();
        return acc + (end - start);
      }, 0);
      avgProcessingTimeSec = Math.round((totalTimeMs / completedJobs.length) / 1000);
    }

    return NextResponse.json({
      totalQuestions: questionsCount.count || 0,
      totalSubjects: subjectsCount.count || 0,
      totalTopics: topicsCount.count || 0,
      todayUploads,
      activeJobs: activeJobs.data || [],
      recentUploads: recentUploads.data || [],
      failedUploads: failedUploads.data || [],
      successRate,
      avgProcessingTimeSec,
    });

  } catch (err: unknown) {
    const errorResponse = handleApiError('/api/admin/dashboard', err);
    return NextResponse.json(errorResponse, { status: 500 });
  }
}
