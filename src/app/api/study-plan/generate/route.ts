import { NextRequest, NextResponse } from "next/server";
import { verifyUserToken, getSupabaseAdmin } from "@/lib/auth-verify";
import { computeWeaknessScore } from "@/lib/ai/weakness";

export async function POST(req: NextRequest) {
  try {
    const authRes = await verifyUserToken(req);
    if (!authRes.ok) {
      return NextResponse.json({ error: authRes.error }, { status: 401 });
    }

    const userId = authRes.uid;
    const supabaseAdmin = getSupabaseAdmin();

    // 1. Determine week start date (Monday of the current week)
    const today = new Date();
    // In JS, 0 is Sunday, 1 is Monday.
    const dayOfWeek = today.getDay();
    const diffToMonday = today.getDate() - dayOfWeek + (dayOfWeek === 0 ? -6 : 1);
    const monday = new Date(today.setDate(diffToMonday));
    monday.setHours(0, 0, 0, 0);
    const weekStartDateStr = monday.toISOString().split('T')[0];

    // 2. Check if a plan already exists for this week
    const { data: existingPlan } = await supabaseAdmin
      .from('study_plans')
      .select('id')
      .eq('user_id', userId)
      .eq('week_start_date', weekStartDateStr)
      .single();

    if (existingPlan) {
      // For now, if client asks to regenerate, we delete the old one.
      await supabaseAdmin.from('study_plans').delete().eq('id', existingPlan.id);
    }

    // 3. Compute deterministic inputs
    const weaknessScores = await computeWeaknessScore(userId);
    
    // Fallback default subjects if user is brand new and has no weakness scores
    const defaultSubjects = ['Polity', 'History', 'Geography', 'Economy', 'Environment', 'Science & Tech'];
    
    // Get top 3 weakest subjects (or default)
    const focusSubjects = weaknessScores.length >= 3 
      ? weaknessScores.slice(0, 3).map(w => w.subject)
      : defaultSubjects.slice(0, 3);

    // Save plan
    const inputSnapshot = {
      weakest_subjects: focusSubjects,
      weakness_data: weaknessScores.slice(0, 5)
    };

    const { data: newPlan, error: planError } = await supabaseAdmin
      .from('study_plans')
      .insert({
        user_id: userId,
        week_start_date: weekStartDateStr,
        input_snapshot: inputSnapshot
      })
      .select()
      .single();

    if (planError || !newPlan) {
      throw new Error("Failed to create study plan row");
    }

    // 4. Generate the 7 days of tasks
    // Strategy:
    // Mon: Practice Weakest Subject 1
    // Tue: Practice Weakest Subject 2
    // Wed: Revision Queue (All)
    // Thu: Practice Weakest Subject 3
    // Fri: Sectional Test (Weakest Subject 1)
    // Sat: Mock Test (Full)
    // Sun: Revision & Rest
    
    const days = [];
    for (let i = 0; i < 7; i++) {
      const planDay = new Date(monday);
      planDay.setDate(monday.getDate() + i);
      const dayDateStr = planDay.toISOString().split('T')[0];
      
      let actionType = 'practice';
      let subjectName = focusSubjects[0];
      let targetCount = 20;

      if (i === 0) { actionType = 'practice'; subjectName = focusSubjects[0]; } // Monday
      else if (i === 1) { actionType = 'practice'; subjectName = focusSubjects[1]; } // Tuesday
      else if (i === 2) { actionType = 'revision'; subjectName = 'All Subjects'; targetCount = 30; } // Wednesday
      else if (i === 3) { actionType = 'practice'; subjectName = focusSubjects[2]; } // Thursday
      else if (i === 4) { actionType = 'sectional_test'; subjectName = focusSubjects[0]; targetCount = 50; } // Friday
      else if (i === 5) { actionType = 'mock'; subjectName = 'GS Paper 1'; targetCount = 100; } // Saturday
      else if (i === 6) { actionType = 'revision'; subjectName = focusSubjects[1]; targetCount = 15; } // Sunday

      days.push({
        plan_id: newPlan.id,
        day_date: dayDateStr,
        subject_name: subjectName,
        action_type: actionType,
        target_count: targetCount,
        completed: false
      });
    }

    const { error: daysError } = await supabaseAdmin
      .from('study_plan_days')
      .insert(days);

    if (daysError) {
      throw new Error(`Failed to insert plan days: ${daysError.message}`);
    }

    return NextResponse.json({ success: true, plan_id: newPlan.id });

  } catch (error: any) {
    console.error("Study Plan Generation API Error:", error);
    return NextResponse.json({ error: (error as Error).message || "Internal Server Error" }, { status: 500 });
  }
}
