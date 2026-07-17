import { NextRequest, NextResponse } from 'next/server';
import { verifyUserToken, getSupabaseAdmin } from '@/lib/auth-verify';

export async function GET(request: NextRequest) {
  const authResult = await verifyUserToken(request);
  if (!authResult.ok) {
    return NextResponse.json({ error: authResult.error }, { status: authResult.status });
  }

  try {
    const supabaseAdmin = getSupabaseAdmin();
    const { uid } = authResult;
    const mode = request.nextUrl.searchParams.get("mode");

    let qQuery = supabaseAdmin.from("questions").select("id, subject_id");
    if (mode === "pyq") {
      qQuery = qQuery.not("year", "is", null);
    }

    const { data: questions, error: qError } = await qQuery;
    if (qError) throw new Error(qError.message);

    const { data: attempts, error: aError } = await supabaseAdmin.from("question_attempts").select("question_id, is_correct").eq("user_id", uid);
    if (aError) throw new Error(aError.message);
    
    return NextResponse.json({
        questions: questions || [],
        attempts: attempts || []
    });

  } catch (err: unknown) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}
