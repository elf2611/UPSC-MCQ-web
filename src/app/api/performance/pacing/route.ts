import { NextRequest, NextResponse } from "next/server";
import { verifyUserToken, getSupabaseAdmin } from "@/lib/auth-verify";

export async function GET(req: NextRequest) {
  try {
    const authRes = await verifyUserToken(req);
    if (!authRes.ok) return NextResponse.json({ error: authRes.error }, { status: 401 });

    const supabaseAdmin = getSupabaseAdmin();

    // 1. Get global benchmarks
    const { data: benchmarks } = await supabaseAdmin
      .from('subject_pacing_benchmarks')
      .select('subject_id, score_band, avg_time_per_question, subjects(name, slug)');

    // 2. Get user's average pacing per subject
    // We'll calculate this dynamically for the last 30 days
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    
    const { data: userAttempts } = await supabaseAdmin
      .from('attempt_answers')
      .select('time_spent_seconds, questions!inner(subject_id, subject)')
      .eq('user_id', authRes.uid)
      .gte('created_at', thirtyDaysAgo.toISOString())
      .gt('time_spent_seconds', 0)
      .lt('time_spent_seconds', 300);

    const userPacing: Record<string, { totalTime: number, count: number, name: string }> = {};

    if (userAttempts) {
      userAttempts.forEach((a: any) => {
        const sid = a.questions.subject_id || a.questions.subject;
        if (!userPacing[sid]) userPacing[sid] = { totalTime: 0, count: 0, name: a.questions.subject || sid };
        userPacing[sid].totalTime += a.time_spent_seconds;
        userPacing[sid].count += 1;
      });
    }

    const formattedUserPacing = Object.entries(userPacing).map(([sid, data]) => ({
      subject_id: sid,
      subject_name: data.name,
      avg_time: data.totalTime / data.count,
      count: data.count
    }));

    return NextResponse.json({ benchmarks: benchmarks || [], userPacing: formattedUserPacing });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
