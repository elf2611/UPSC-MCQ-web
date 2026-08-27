import { NextRequest, NextResponse } from "next/server";
import { verifyUserToken, getSupabaseAdmin } from "@/lib/auth-verify";

export async function GET(req: NextRequest) {
  try {
    const authRes = await verifyUserToken(req);
    if (!authRes.ok) return NextResponse.json({ error: authRes.error }, { status: 401 });

    const supabase = getSupabaseAdmin();

    const [qRes, rRes] = await Promise.all([
      supabase.from('interview_questions').select('*').order('created_at', { ascending: false }),
      supabase.from('interview_responses').select('*').eq('user_id', authRes.uid).order('submitted_at', { ascending: false })
    ]);

    return NextResponse.json({
      questions: qRes.data || [],
      responses: rRes.data || []
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
