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
    let query = supabaseAdmin.from("questions").select("id, subject_id, subject, topic, subtopic, question_text, option_a, option_b, option_c, option_d, difficulty, year");

    if (mode === "practice" || mode === "test" || mode === "pyq") {
      if (subject) {
        // Handle both subject string name and subject_id UUID depending on how it's stored
        if (subject.length === 36 && subject.includes('-')) {
          query = query.eq("subject_id", subject);
        } else {
          query = query.eq("subject", subject);
        }
      }
      if (topic) query = query.eq("topic", topic);
      if (subtopic) query = query.eq("subtopic", subtopic);
      if (year) query = query.eq("year", year);
      
      if (mode === "pyq") {
        query = query.not("year", "is", null);
      }
      
      if (difficulty && difficulty !== "All Levels") query = query.eq("difficulty", difficulty);
      query = query.limit(customCount || 10);
    } else if (mode === "mock" && testId) {
      query = query.limit(100);
    } else if (mode === "custom") {
      query = query.limit(customCount || 10);
    } else if (mode === "current-affairs") {
      query = query.eq("source", "current-affairs");
      if (date) {
        query = query.eq("article_date", date);
      }
      query = query.limit(100); // Reasonable limit for daily questions
    }

    const { data, error } = await query;
    if (error) throw new Error((error as Error).message);

    return NextResponse.json({ questions: data || [] });
  } catch (err: unknown) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}
