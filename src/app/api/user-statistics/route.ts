import { NextRequest, NextResponse } from 'next/server';
import { verifyUserToken, getSupabaseAdmin } from '@/lib/auth-verify';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const authResult = await verifyUserToken(request);
  if (!authResult.ok) {
    return NextResponse.json({ error: authResult.error }, { status: authResult.status });
  }

  try {
    const supabaseAdmin = getSupabaseAdmin();
    const { uid } = authResult;

    // 1. Fetch Profile
    const { data: profile } = await supabaseAdmin.from("profiles").select("xp, level, streak_count").eq("id", uid).single();

    // 2. Fetch Recent Tests
    const { data: testData } = await supabaseAdmin
      .from("test_attempts")
      .select("*")
      .eq("user_id", uid)
      .order("submitted_at", { ascending: false })
      .limit(10);

    // 3. Compute total practiced & accuracy
    const attemptIds = (testData || []).map((a: Record<string, unknown>) => a.id);
    let attemptAnswers: Record<string, unknown>[] = [];
    if (attemptIds.length > 0) {
      const { data: answersData } = await supabaseAdmin
        .from("attempt_answers")
        .select("is_correct, created_at")
        .in("attempt_id", attemptIds);
      if (answersData) attemptAnswers = answersData;
    }

    // 4. Fetch Weak Subjects
    const { data: weakData } = await supabaseAdmin
      .from("user_statistics")
      .select("accuracy_percent, total_attempted, subject_id")
      .eq("user_id", uid)
      .gte("total_attempted", 2)
      .order("accuracy_percent", { ascending: true })
      .limit(5);

    // 5. Fetch Badges
    const { data: badgeData } = await supabaseAdmin
      .from("achievements")
      .select("badge_name, earned_at")
      .eq("user_id", uid);

    return NextResponse.json({
        profile: profile || { xp: 0, level: 1, streak_count: 0 },
        tests: testData || [],
        answers: attemptAnswers || [],
        weakTopics: weakData || [],
        badges: badgeData || []
    });

  } catch (err: unknown) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}
