import { getSupabaseAdmin } from "@/lib/auth-verify";

export interface AIMemory {
  id?: string;
  user_id: string;
  memory_type: string;
  content: string;
  relevance_score?: number;
  created_at?: string;
}

/**
 * Saves a specific learning memory for a student.
 */
export async function saveStudentMemory(userId: string, memoryType: 'weakness' | 'preference' | 'repeated_mistake' | 'general', content: string, score: number = 1.0) {
  const supabase = getSupabaseAdmin();
  
  const { error } = await supabase.from('student_ai_memory').insert({
    user_id: userId,
    memory_type: memoryType,
    content,
    relevance_score: score
  });

  if (error) {
    console.error("[AI Memory] Failed to save memory:", error);
    throw new Error("Failed to save student memory");
  }
}

/**
 * Retrieves the top relevant memories for a student.
 */
export async function getRelevantMemories(userId: string, limit: number = 5): Promise<AIMemory[]> {
  const supabase = getSupabaseAdmin();
  
  const { data, error } = await supabase
    .from('student_ai_memory')
    .select('*')
    .eq('user_id', userId)
    .order('relevance_score', { ascending: false })
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) {
    console.error("[AI Memory] Failed to retrieve memories:", error);
    return [];
  }

  return data as AIMemory[];
}

/**
 * Retrieves user statistics to understand overall accuracy.
 */
export async function getStudentStats(userId: string) {
  const supabase = getSupabaseAdmin();
  
  // Get aggregated stats from user_statistics (assuming it stores subject-level stats)
  const { data, error } = await supabase
    .from('user_statistics')
    .select('subject_id, topic_id, accuracy_percent, total_attempted')
    .eq('user_id', userId)
    .order('accuracy_percent', { ascending: true })
    .limit(10);

  if (error) {
    console.error("[AI Memory] Failed to get stats:", error);
    return [];
  }
  
  return data;
}
