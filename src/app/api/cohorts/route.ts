import { NextRequest, NextResponse } from "next/server";
import { verifyUserToken, getSupabaseAdmin } from "@/lib/auth-verify";

export async function GET(req: NextRequest) {
  try {
    const authRes = await verifyUserToken(req);
    if (!authRes.ok) return NextResponse.json({ error: authRes.error }, { status: 401 });

    const supabaseAdmin = getSupabaseAdmin();

    // Find the user's cohort membership
    const { data: membership } = await supabaseAdmin
      .from('cohort_memberships')
      .select('cohort_id, leaderboard_opt_in, cohorts(name, target_exam_year)')
      .eq('user_id', authRes.uid)
      .single();

    if (!membership) {
      // Return available cohorts to join
      const { data: cohorts } = await supabaseAdmin.from('cohorts').select('*').order('target_exam_year');
      return NextResponse.json({ inCohort: false, availableCohorts: cohorts || [] });
    }

    // Get current week leaderboard
    const currentWeekStart = new Date();
    currentWeekStart.setUTCHours(0,0,0,0);
    const day = currentWeekStart.getUTCDay(); // 0 is Sunday, 1 is Monday...
    const diff = currentWeekStart.getUTCDate() - day + (day === 0 ? -6 : 1); 
    currentWeekStart.setUTCDate(diff); // Shift to Monday

    const { data: leaderboard } = await supabaseAdmin
      .from('cohort_leaderboards')
      .select('user_id, questions_attempted, accuracy_percent, xp_earned, rank_position, profiles(name)')
      .eq('cohort_id', membership.cohort_id)
      .eq('week_start_date', currentWeekStart.toISOString().split('T')[0])
      .order('rank_position', { ascending: true })
      .limit(50);

    return NextResponse.json({
      inCohort: true,
      membership,
      leaderboard: leaderboard || []
    });

  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const authRes = await verifyUserToken(req);
    if (!authRes.ok) return NextResponse.json({ error: authRes.error }, { status: 401 });

    const body = await req.json();
    const supabaseAdmin = getSupabaseAdmin();

    const { error } = await supabaseAdmin
      .from('cohort_memberships')
      .upsert({ user_id: authRes.uid, cohort_id: body.cohort_id, leaderboard_opt_in: true });

    if (error) throw error;
    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
