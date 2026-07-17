import { NextRequest, NextResponse } from 'next/server';
import { verifyUserToken, getSupabaseAdmin } from '@/lib/auth-verify';

export async function POST(request: NextRequest) {
  const authResult = await verifyUserToken(request);
  if (!authResult.ok) {
    return NextResponse.json({ error: authResult.error }, { status: authResult.status });
  }

  try {
    const { mode, subject, topic, difficulty, testId, customCount } = await request.json();
    const supabaseAdmin = getSupabaseAdmin();
    let query = supabaseAdmin.from("questions").select("*");

    if (mode === "practice" || mode === "test") {
      if (subject) {
        // Handle both subject string name and subject_id UUID depending on how it's stored
        if (subject.length === 36 && subject.includes('-')) {
          query = query.eq("subject_id", subject);
        } else {
          query = query.eq("subject", subject);
        }
      }
      if (topic) query = query.eq("topic", topic);
      if (difficulty && difficulty !== "All Levels") query = query.eq("difficulty", difficulty);
      query = query.limit(customCount || 10);
    } else if (mode === "mock" && testId) {
      query = query.limit(100);
    } else if (mode === "custom") {
      query = query.limit(customCount || 10);
    }

    const { data, error } = await query;
    if (error) throw new Error((error as Error).message);

    return NextResponse.json({ questions: data || [] });
  } catch (err: unknown) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}
