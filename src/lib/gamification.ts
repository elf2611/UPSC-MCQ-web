import { supabase } from "@/lib/supabase";

export async function awardXP(
  userId: string,
  action: 'correct_answer' | 'question_attempted' | 'mock_completed' | 'streak_bonus' | 'review_got_it' | 'review_tricky'
): Promise<{ newXp: number; newLevel: number; leveledUp: boolean; xpEarned: number }> {
  let xpEarned = 0;
  if (action === 'correct_answer') xpEarned = 5;
  else if (action === 'question_attempted') xpEarned = 2;
  else if (action === 'mock_completed') xpEarned = 50;
  else if (action === 'streak_bonus') xpEarned = 100;
  else if (action === 'review_got_it') xpEarned = 3;
  else if (action === 'review_tricky') xpEarned = 1;

  const { data: profile } = await supabase
    .from("profiles")
    .select("xp, level")
    .eq("id", userId)
    .single();

  const currentXp = profile?.xp || 0;
  const currentLevel = profile?.level || 1;
  const newXp = currentXp + xpEarned;

  const thresholds = [0, 500, 1500, 3000, 6000, 10000];
  let newLevel = 1;
  for (let i = 0; i < thresholds.length; i++) {
    if (newXp >= thresholds[i]) {
      newLevel = i + 1; 
    }
  }

  if (newLevel < currentLevel) newLevel = currentLevel;
  const leveledUp = newLevel > currentLevel;

  await supabase
    .from("profiles")
    .update({ xp: newXp, level: newLevel })
    .eq("id", userId);

  return { newXp, newLevel, leveledUp, xpEarned };
}

export async function updateStreak(userId: string): Promise<{ newStreak: number; bonusAwarded: boolean }> {
  const { data: profile } = await supabase
    .from("profiles")
    .select("streak_count, last_active")
    .eq("id", userId)
    .single();

  let streak = profile?.streak_count || 0;
  const lastActive = profile?.last_active;
  const todayStr = new Date().toISOString().split("T")[0];
  let bonusAwarded = false;

  if (lastActive === todayStr) {
    return { newStreak: streak, bonusAwarded: false };
  }

  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  const yesterdayStr = yesterday.toISOString().split("T")[0];

  if (lastActive === yesterdayStr) {
    streak += 1;
    if (streak > 0 && streak % 7 === 0) {
      await awardXP(userId, 'streak_bonus');
      bonusAwarded = true;
    }
  } else {
    streak = 1;
  }

  await supabase
    .from("profiles")
    .update({ streak_count: streak, last_active: todayStr })
    .eq("id", userId);

  return { newStreak: streak, bonusAwarded };
}

export async function checkBadges(userId: string, trigger: string) {
  // We'll run a series of checks based on the trigger or general sweeps
  const earned: unknown[] = [];
  
  const grantBadge = async (badge_name: string, badge_type: string) => {
    const { data } = await supabase
      .from("achievements")
      .select("id")
      .eq("user_id", userId)
      .eq("badge_name", badge_name);
      
    if (!data || data.length === 0) {
      const { data: newBadge } = await supabase
        .from("achievements")
        .insert({ user_id: userId, badge_name, badge_type })
        .select()
        .single();
      if (newBadge) earned.push(newBadge);
    }
  };

  // Profile data
  const { data: profile } = await supabase.from("profiles").select("*").eq("id", userId).single();
  if (!profile) return earned;

  // First question
  if (trigger === 'first_question' || trigger === 'question_attempted') {
    await grantBadge("First Step", "milestone");
  }

  // Streak Badges
  if (profile.streak_count >= 7) await grantBadge("Week Warrior", "streak");
  if (profile.streak_count >= 30) await grantBadge("Streak Legend", "streak");

  // Scholar
  if (profile.level >= 3) await grantBadge("Scholar", "level");

  // Need aggregated stats for others
  if (trigger === 'test_completed') {
    const { count: mockCount } = await supabase.from("test_attempts").select("*", { count: 'exact', head: true }).eq("user_id", userId).eq("mode", "mock");
    if (mockCount && mockCount >= 5) await grantBadge("Mock Master", "milestone");
    
    // Total correct 
    // we can sum from user_statistics where topic_id is null
    const { data: stats } = await supabase.from("user_statistics").select("total_correct").eq("user_id", userId).is("topic_id", null);
    if (stats) {
      const totalCorrect = stats.reduce((acc, row) => acc + (row.total_correct || 0), 0);
      if (totalCorrect >= 100) await grantBadge("Century", "milestone");
    }
  }

  // Subject Specific
  if (trigger === 'polity_ace') {
    // Just an example check, ideally we check real subject names
    const { data: polStat } = await supabase
      .from("user_statistics")
      .select("*, subjects!inner(name)")
      .eq("user_id", userId)
      .is("topic_id", null)
      .eq("subjects.name", "Polity")
      .single();
      
    if (polStat && polStat.total_attempted >= 20 && polStat.accuracy_percent >= 80) {
      await grantBadge("Polity Pro", "subject");
    }
  }

  return earned;
}
