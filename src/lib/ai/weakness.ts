import { getSupabaseAdmin } from "../auth-verify";

export interface WeakTopic {
  subject: string;
  topic: string;
  weaknessScore: number;
  totalAttempts: number;
  correctRate: number;
}

/**
 * Computes a weakness score for all topics a user has attempted.
 * Weakness Score = (1 - correctRate) * log10(totalAttempts + 1)
 * Higher score means it's a priority for revision.
 */
export async function computeWeaknessScore(userId: string): Promise<WeakTopic[]> {
  const supabaseAdmin = getSupabaseAdmin();
  
  // Fetch the last 1000 answers to keep calculation fast and recency-weighted
  const { data: answers, error } = await supabaseAdmin
    .from('attempt_answers')
    .select(`
      is_correct,
      questions!inner (
        subject,
        topic
      )
    `)
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(1000);

  if (error || !answers) {
    console.error("Error fetching attempt answers for weakness score:", error);
    return [];
  }

  // Aggregate by subject|topic
  const agg: Record<string, { subject: string, topic: string, correct: number, total: number }> = {};

  answers.forEach((ans: any) => {
    if (!ans.questions) return;
    const subject = ans.questions.subject || 'Unknown';
    const topic = ans.questions.topic || 'Unknown';
    const key = `${subject}|${topic}`;

    if (!agg[key]) {
      agg[key] = { subject, topic, correct: 0, total: 0 };
    }

    agg[key].total++;
    if (ans.is_correct) {
      agg[key].correct++;
    }
  });

  const topics: WeakTopic[] = Object.values(agg).map(stat => {
    const correctRate = stat.correct / stat.total;
    // Simple weakness formula: higher error rate + higher total attempts = more weak
    // You want to focus on topics they get wrong often AND have practiced a decent amount (not just 1 question).
    const weaknessScore = (1 - correctRate) * Math.log10(stat.total + 1);

    return {
      subject: stat.subject,
      topic: stat.topic,
      weaknessScore,
      totalAttempts: stat.total,
      correctRate,
    };
  });

  // Sort descending by weakness score
  topics.sort((a, b) => b.weaknessScore - a.weaknessScore);

  return topics;
}
