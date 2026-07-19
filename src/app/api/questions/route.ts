import { NextRequest, NextResponse } from 'next/server';
import { verifyUserToken, getSupabaseAdmin } from '@/lib/auth-verify';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  const authResult = await verifyUserToken(request);
  if (!authResult.ok) {
    return NextResponse.json({ error: authResult.error }, { status: authResult.status });
  }

  try {
    const { mode, subject, topic, subtopic, difficulty, testId, customCount, date, year } = await request.json();
    const supabaseAdmin = getSupabaseAdmin();

    let limit = 10;
    if (mode === "mock" && testId) {
      limit = 100;
    } else if (mode === "custom") {
      limit = customCount || 10;
    } else if (mode === "current-affairs") {
      limit = 100; // Reasonable limit for daily questions
    } else {
      limit = customCount || 10;
    }

    const { data, error } = await supabaseAdmin.rpc('get_random_questions', {
      p_user_id: authResult.uid,
      p_subject: subject || null,
      p_topic: topic || null,
      p_subtopic: subtopic || null,
      p_difficulty: (difficulty && difficulty !== "All Levels") ? difficulty : null,
      p_year: year || null,
      p_date: date || null,
      p_mode: mode || 'practice',
      p_limit: limit
    }).select("id, subject_id, subject, topic, subtopic, question_text, option_a, option_b, option_c, option_d, difficulty, year");

    if (error) throw new Error(error.message);

    return NextResponse.json({ questions: data || [] });
  } catch (err: unknown) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}
