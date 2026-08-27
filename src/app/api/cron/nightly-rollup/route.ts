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
      const userIds = Array.from(new Set(attempts.map(a => a.user_id)));
      const questionIds = Array.from(new Set(attempts.map(a => a.question_id)));

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
      for (const [key, score] of Array.from(abilityMap.entries())) {
        const [userId, subjectId] = key.split('_');
        if (!subjectId || subjectId === 'undefined') continue;
        await supabaseAdmin
          .from('user_statistics')
          .update({ rolling_ability_score: Math.round(score) })
          .match({ user_id: userId, subject_id: subjectId });
      }

      for (const [qId, score] of Array.from(difficultyMap.entries())) {
        await supabaseAdmin
          .from('questions')
          .update({ difficulty_rating: Math.round(score) })
          .eq('id', qId);
      }
    }

    
    // Feature 5: Weak-Topic Diagnostic -> Auto-Revision Queue
    if (attempts && attempts.length > 0) {
      // Find questions answered wrong yesterday
      const wrongAttempts = attempts.filter((a: any) => !a.is_correct);
      
      for (const attempt of wrongAttempts) {
        // Check historical attempts for this user and question
        const { data: history } = await supabaseAdmin
          .from('attempt_answers')
          .select('id, is_correct')
          .eq('user_id', attempt.user_id)
          .eq('question_id', attempt.question_id);
          
        if (history) {
          const wrongCount = history.filter(h => !h.is_correct).length;
          
          if (wrongCount >= 2) {
            // Upsert to revision queue
            const tomorrow = new Date();
            tomorrow.setDate(tomorrow.getDate() + 1);
            
            await supabaseAdmin
              .from('revision_queue')
              .upsert({
                user_id: attempt.user_id,
                question_id: attempt.question_id,
                source: 'auto_wrong_twice',
                next_review_date: tomorrow.toISOString().split('T')[0],
                weakness_score: wrongCount * 10
              }, { onConflict: 'user_id, question_id' });
          }
        }
      }
      
      // Auto-Stale logic: check questions answered correct > 14 days ago and not in revision queue
      const twoWeeksAgo = new Date();
      twoWeeksAgo.setDate(twoWeeksAgo.getDate() - 14);
      
      const { data: staleAttempts } = await supabaseAdmin
        .from('attempt_answers')
        .select('user_id, question_id')
        .eq('is_correct', true)
        .lt('created_at', twoWeeksAgo.toISOString())
        .limit(100); // Batching in reality
        
      if (staleAttempts) {
        for (const stale of staleAttempts) {
          const tomorrow = new Date();
          tomorrow.setDate(tomorrow.getDate() + 1);
          await supabaseAdmin
            .from('revision_queue')
            .upsert({
              user_id: stale.user_id,
              question_id: stale.question_id,
              source: 'auto_stale',
              next_review_date: tomorrow.toISOString().split('T')[0]
            }, { onConflict: 'user_id, question_id', ignoreDuplicates: true });
        }
      }
    }
    
    
    // Feature 6: Progress Contracts Evaluation
    const { data: activeContracts } = await supabaseAdmin
      .from('progress_contracts')
      .select('*')
      .eq('status', 'active');

    if (activeContracts && activeContracts.length > 0) {
      const today = new Date().toISOString().split('T')[0];
      
      for (const contract of activeContracts) {
        // Evaluate progress based on goal type
        // In a real prod environment, we would query the actual progress delta here.
        // For 'questions', we count attempt_answers since start_date.
        let currentProgress = 0;
        
        if (contract.goal_type === 'questions') {
          const { count } = await supabaseAdmin
            .from('attempt_answers')
            .select('id', { count: 'exact', head: true })
            .eq('user_id', contract.user_id)
            .gte('created_at', contract.start_date);
          currentProgress = count || 0;
        } 
        else if (contract.goal_type === 'streak') {
          // This requires user_profiles.streak logic, assuming 0 for now as stub.
          currentProgress = contract.current_progress + 1; // Simplification
        }
        else if (contract.goal_type === 'accuracy') {
          const { data: accData } = await supabaseAdmin
            .from('attempt_answers')
            .select('is_correct')
            .eq('user_id', contract.user_id)
            .gte('created_at', contract.start_date);
            
          if (accData && accData.length > 0) {
            const correct = accData.filter((a: any) => a.is_correct).length;
            currentProgress = (correct / accData.length) * 100;
          }
        }

        let newStatus = 'active';
        if (currentProgress >= contract.target_value) {
          newStatus = 'succeeded';
        } else if (today > contract.end_date) {
          newStatus = 'failed';
        }

        await supabaseAdmin
          .from('progress_contracts')
          .update({ 
            current_progress: currentProgress,
            status: newStatus,
            updated_at: new Date().toISOString()
          })
          .eq('id', contract.id);
          
        if (newStatus === 'succeeded') {
          // Reward achievement
          await supabaseAdmin.from('achievements').upsert({
            user_id: contract.user_id,
            badge_name: `Contract Killer: ${contract.goal_type}`,
            badge_type: 'contract'
          }, { onConflict: 'user_id, badge_name' });
        }
      }
    }



    
    // Feature 8: Timed Sectional Pacing Analytics
    // Let Postgres handle the heavy aggregation
    await supabaseAdmin.rpc('refresh_pacing_benchmarks');

    return NextResponse.json({ success: true, message: "Rollup completed." });
  } catch (error: any) {
    console.error("Nightly Rollup Error:", error);
    return NextResponse.json({ error: error.message || "Internal Server Error" }, { status: 500 });
  }
}
