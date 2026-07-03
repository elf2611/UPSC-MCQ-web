import { supabase } from "@/lib/supabase";

export async function updateStatistics(
  userId: string,
  subjectId: string,
  topicId: string | null | undefined,
  isCorrect: boolean
) {
  if (!userId || !subjectId) return;

  // Helper to upsert a specific stat row
  const upsertStat = async (tId: string | null) => {
    // We can't do a standard supabase upsert easily with conditional unique indices.
    // We'll try to select, then insert or update.
    
    let query = supabase
      .from("user_statistics")
      .select("*")
      .eq("user_id", userId)
      .eq("subject_id", subjectId);
      
    if (tId) {
      query = query.eq("topic_id", tId);
    } else {
      query = query.is("topic_id", null);
    }

    const { data: existing } = await query.single();

    if (existing) {
      const newAttempted = existing.total_attempted + 1;
      const newCorrect = existing.total_correct + (isCorrect ? 1 : 0);
      const newAccuracy = (newCorrect / newAttempted) * 100;
      
      let updateQuery = supabase
        .from("user_statistics")
        .update({
          total_attempted: newAttempted,
          total_correct: newCorrect,
          accuracy_percent: newAccuracy,
          updated_at: new Date().toISOString()
        })
        .eq("user_id", userId)
        .eq("subject_id", subjectId);
        
      if (tId) {
        updateQuery = updateQuery.eq("topic_id", tId);
      } else {
        updateQuery = updateQuery.is("topic_id", null);
      }
      
      await updateQuery;
    } else {
      await supabase.from("user_statistics").insert({
        user_id: userId,
        subject_id: subjectId,
        topic_id: tId || null,
        total_attempted: 1,
        total_correct: isCorrect ? 1 : 0,
        accuracy_percent: isCorrect ? 100 : 0
      });
    }
  };

  // 1. Update subject-level stats
  await upsertStat(null);

  // 2. Update topic-level stats (if exists)
  if (topicId) {
    await upsertStat(topicId);
  }
}
