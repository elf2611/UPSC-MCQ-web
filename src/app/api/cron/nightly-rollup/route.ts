import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/auth-verify";

export const maxDuration = 300; // 5 mins max for a rollup job
// NOTE: Vercel cron requires a secure secret to prevent external triggering
const CRON_SECRET = process.env.CRON_SECRET || 'dev-secret-key';

export async function GET(req: NextRequest) {
  const authHeader = req.headers.get('authorization');
  if (authHeader !== `Bearer ${CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const supabaseAdmin = getSupabaseAdmin();
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    yesterday.setHours(0, 0, 0, 0);
    
    // Feature 4: Adaptive Difficulty Engine - Elo Score Updates
    // Fetch attempts from yesterday
    const { data: attempts } = await supabaseAdmin
      .from('attempt_answers')
      .select(`
        is_correct,
        user_id,
        question_id,
        questions!inner(difficulty_rating, subject_id),
        profiles!inner(id)
      `)
      .gte('created_at', yesterday.toISOString());

    if (attempts && attempts.length > 0) {
      const kFactor = 32; // Standard Elo K-factor
      
      // We need current scores to compute deltas
      // For a real production system with thousands of users, we'd do this in batches or via SQL directly.
      // Doing it via Edge function for simplicity.
      const userIds = [...new Set(attempts.map(a => a.user_id))];
      const questionIds = [...new Set(attempts.map(a => a.question_id))];

      const { data: userStats } = await supabaseAdmin
        .from('user_statistics')
        .select('user_id, subject_id, rolling_ability_score')
        .in('user_id', userIds);

      const { data: qs } = await supabaseAdmin
        .from('questions')
        .select('id, difficulty_rating')
        .in('id', questionIds);

      const abilityMap = new Map();
      userStats?.forEach(u => abilityMap.set(`${u.user_id}_${u.subject_id}`, u.rolling_ability_score || 1200));

      const difficultyMap = new Map();
      qs?.forEach(q => difficultyMap.set(q.id, q.difficulty_rating || 1200));

      attempts.forEach((ans: any) => {
        const uKey = `${ans.user_id}_${ans.questions.subject_id}`;
        const qKey = ans.question_id;

        let uScore = abilityMap.get(uKey) || 1200;
        let qScore = difficultyMap.get(qKey) || 1200;

        // Calculate expected probability (Elo)
        const expectedUser = 1 / (1 + Math.pow(10, (qScore - uScore) / 400));
        const expectedQuestion = 1 - expectedUser;

        const actualUser = ans.is_correct ? 1 : 0;
        const actualQuestion = ans.is_correct ? 0 : 1;

        uScore = uScore + kFactor * (actualUser - expectedUser);
        qScore = qScore + kFactor * (actualQuestion - expectedQuestion);

        abilityMap.set(uKey, uScore);
        difficultyMap.set(qKey, qScore);
      });

      // Update Database
      for (const [key, score] of abilityMap.entries()) {
        const [userId, subjectId] = key.split('_');
        if (!subjectId || subjectId === 'undefined') continue;
        await supabaseAdmin
          .from('user_statistics')
          .update({ rolling_ability_score: Math.round(score) })
          .match({ user_id: userId, subject_id: subjectId });
      }

      for (const [qId, score] of difficultyMap.entries()) {
        await supabaseAdmin
          .from('questions')
          .update({ difficulty_rating: Math.round(score) })
          .eq('id', qId);
      }
    }

    // TODO: Add #5 Revision Queue auto-adds and #6 Milestone Evaluation here

    return NextResponse.json({ success: true, message: "Rollup completed." });
  } catch (error: any) {
    console.error("Nightly Rollup Error:", error);
    return NextResponse.json({ error: error.message || "Internal Server Error" }, { status: 500 });
  }
}
