import { NextRequest, NextResponse } from 'next/server';
import { verifyUserToken, getSupabaseAdmin } from '@/lib/auth-verify';

export async function POST(request: NextRequest) {
  const authResult = await verifyUserToken(request);
  if (!authResult.ok) {
    return NextResponse.json({ error: authResult.error }, { status: authResult.status });
  }

  try {
    const { name, email } = await request.json();
    const supabaseAdmin = getSupabaseAdmin();
    const { uid } = authResult;

    // Check if profile exists
    const { data: profile } = await supabaseAdmin
      .from("profiles")
      .select("*")
      .eq("id", uid)
      .single();

    if (profile) {
      return NextResponse.json({ profile });
    }

    // Create new profile
    const displayName = name || email?.split('@')[0] || 'User';
    const newProfile = {
      id: uid,
      name: displayName,
      email: email,
      plan: "free",
      role: "student"
    };

    const { error: insertError } = await supabaseAdmin.from("profiles").insert(newProfile);
    if (insertError) throw new Error(insertError.message);

    return NextResponse.json({ profile: newProfile });
  } catch (err: unknown) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}
