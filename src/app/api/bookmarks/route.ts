import { NextRequest, NextResponse } from 'next/server';
import { verifyUserToken, getSupabaseAdmin } from '@/lib/auth-verify';

export async function GET(request: NextRequest) {
  const authResult = await verifyUserToken(request);
  if (!authResult.ok) {
    return NextResponse.json({ error: authResult.error }, { status: authResult.status });
  }

  try {
    const supabaseAdmin = getSupabaseAdmin();
    const { data, error } = await supabaseAdmin
      .from("bookmarks")
      .select("question_id")
      .eq("user_id", authResult.uid);

    if (error) throw new Error((error as Error).message);

    return NextResponse.json({ bookmarks: data || [] });
  } catch (err: unknown) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const authResult = await verifyUserToken(request);
  if (!authResult.ok) {
    return NextResponse.json({ error: authResult.error }, { status: authResult.status });
  }

  try {
    const { question_id, action } = await request.json();
    const supabaseAdmin = getSupabaseAdmin();
    
    if (action === 'add') {
      const { error } = await supabaseAdmin.from("bookmarks").insert({
        user_id: authResult.uid,
        question_id,
        folder_name: 'General'
      });
      if (error) throw new Error((error as Error).message);
    } else if (action === 'remove') {
      const { error } = await supabaseAdmin.from("bookmarks").delete().match({
        user_id: authResult.uid,
        question_id
      });
      if (error) throw new Error((error as Error).message);
    } else {
       return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
    }

    return NextResponse.json({ success: true });
  } catch (err: unknown) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}
