import { NextRequest, NextResponse } from 'next/server';
import { verifyUserToken, getSupabaseAdmin } from '@/lib/auth-verify';

export async function GET(request: NextRequest) {
  try {
    const authResult = await verifyUserToken(request);
    const supabaseAdmin = getSupabaseAdmin();
    
    // Fetch all tests
    const { data: tests, error: testsError } = await supabaseAdmin.from("tests").select("*");
    if (testsError) throw new Error(testsError.message);

    let attempts: Record<string, unknown>[] = [];
    if (authResult.ok) {
      const { data: userAttempts, error: attemptsError } = await supabaseAdmin
        .from("test_attempts")
        .select("*")
        .eq("user_id", authResult.uid);
        
      if (!attemptsError && userAttempts) {
        attempts = userAttempts;
      }
    }

    return NextResponse.json({ tests: tests || [], attempts });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
