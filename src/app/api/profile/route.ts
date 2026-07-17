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

    // Fetch Profile
    const { data: profile } = await supabaseAdmin.from("profiles").select("*").eq("id", uid).single();

    // Fetch Recent Tests
    const { data: testData } = await supabaseAdmin
      .from("test_attempts")
      .select("*")
      .eq("user_id", uid)
      .order("submitted_at", { ascending: false })
      .limit(50);

    return NextResponse.json({
        profile: profile || null,
        tests: testData || []
    });

  } catch (err: unknown) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  const authResult = await verifyUserToken(request);
  if (!authResult.ok) {
    return NextResponse.json({ error: authResult.error }, { status: authResult.status });
  }

  try {
    const payload = await request.json();
    const supabaseAdmin = getSupabaseAdmin();
    const { uid } = authResult;

    const { error } = await supabaseAdmin.from("profiles").update(payload).eq("id", uid);
    if (error) throw new Error((error as Error).message);

    return NextResponse.json({ success: true });
  } catch (err: unknown) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}
