import { NextRequest, NextResponse } from 'next/server';
import { verifyAdminToken, getSupabaseAdmin } from '@/lib/auth-verify';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const authResult = await verifyAdminToken(request);
    if (!authResult.ok) {
      return NextResponse.json({ error: authResult.error, detail: authResult.detail }, { status: authResult.status });
    }

    const { searchParams } = new URL(request.url);
    const questionId = searchParams.get('questionId');

    if (!questionId) {
      return NextResponse.json({ error: 'questionId is required' }, { status: 400 });
    }

    const supabaseAdmin = getSupabaseAdmin();
    const { data, error } = await supabaseAdmin
      .from('question_history')
      .select('*, profiles:edited_by(email)')
      .eq('question_id', questionId)
      .order('edited_at', { ascending: false });

    if (error) throw new Error(error.message);

    return NextResponse.json({ history: data || [] });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
