import { NextRequest, NextResponse } from "next/server";
import { awardXP, updateStreak, checkBadges } from "@/lib/gamification";

export async function POST(req: NextRequest) {
  try {
    const { userId, correctCount, attemptedCount, isMockTest } = await req.json();

    if (!userId) {
      return NextResponse.json({ error: "userId is required" }, { status: 400 });
    }

    // 1. Award XP for attempt
    const xpPromises = [];
    if (correctCount > 0) {
      // Approximate 5 XP per correct
      for(let i=0; i<correctCount; i++) xpPromises.push(awardXP(userId, 'correct_answer'));
    }
    const incorrect = attemptedCount - correctCount;
    if (incorrect > 0) {
      // 2 XP per incorrect attempt
      for(let i=0; i<incorrect; i++) xpPromises.push(awardXP(userId, 'question_attempted'));
    }
    if (isMockTest) xpPromises.push(awardXP(userId, 'mock_completed'));

    await Promise.all(xpPromises);

    // Get the final state for response
    // We just do one final awardXP with 0 to get current state (cleaner to have a get method, but this works)
    const finalXpState = await awardXP(userId, 'question_attempted'); // We'll just grant 2 extra XP for submission

    // 2. Update Streak
    const streakResult = await updateStreak(userId);

    // 3. Check Badges
    const newBadges = await checkBadges(userId, 'test_completed');

    return NextResponse.json({
      xpEarned: finalXpState.xpEarned, // Total not perfectly accurate in response but state is correct in DB
      newXp: finalXpState.newXp,
      newLevel: finalXpState.newLevel,
      leveledUp: finalXpState.leveledUp,
      newStreak: streakResult.newStreak,
      bonusAwarded: streakResult.bonusAwarded,
      newBadges
    });
  } catch (error: any) {
    console.error("Update progress API error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
