import { NextRequest, NextResponse } from 'next/server';
import { verifyUserToken, getSupabaseAdmin } from '@/lib/auth-verify';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const authResult = await verifyUserToken(request);
  if (!authResult.ok) {
    return NextResponse.json({ error: authResult.error }, { status: authResult.status });
  }

  try {
    const supabaseAdmin = getSupabaseAdmin();

    const [subjectsRes, topicsRes, subtopicsRes] = await Promise.all([
      supabaseAdmin.from('subjects').select('id, name, slug, description').order('name'),
      supabaseAdmin.from('topics').select('id, name, slug, subject_id').order('name'),
      supabaseAdmin.from('subtopics').select('id, name, slug, topic_id').order('name'),
    ]);

    if (subjectsRes.error) throw new Error(subjectsRes.error.message);
    if (topicsRes.error) throw new Error(topicsRes.error.message);
    if (subtopicsRes.error) throw new Error(subtopicsRes.error.message);

    return NextResponse.json({
      subjects: subjectsRes.data || [],
      topics: topicsRes.data || [],
      subtopics: subtopicsRes.data || [],
    });
  } catch (err: unknown) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}
