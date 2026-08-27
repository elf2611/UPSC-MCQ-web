import { NextRequest, NextResponse } from "next/server";
import { verifyUserToken, getSupabaseAdmin } from "@/lib/auth-verify";

export async function GET(req: NextRequest) {
  try {
    const authRes = await verifyUserToken(req);
    if (!authRes.ok) return NextResponse.json({ error: authRes.error }, { status: 401 });

    const supabaseAdmin = getSupabaseAdmin();
    const { data: contracts } = await supabaseAdmin
      .from('progress_contracts')
      .select('*')
      .eq('user_id', authRes.uid)
      .order('created_at', { ascending: false });

    return NextResponse.json({ contracts: contracts || [] });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const authRes = await verifyUserToken(req);
    if (!authRes.ok) return NextResponse.json({ error: authRes.error }, { status: 401 });

    const { goalType, targetValue, durationDays } = await req.json();
    if (!goalType || !targetValue || !durationDays) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    const endDate = new Date();
    endDate.setDate(endDate.getDate() + parseInt(durationDays));

    const supabaseAdmin = getSupabaseAdmin();
    const { data, error } = await supabaseAdmin
      .from('progress_contracts')
      .insert({
        user_id: authRes.uid,
        goal_type: goalType,
        target_value: targetValue,
        end_date: endDate.toISOString().split('T')[0],
      })
      .select()
      .single();

    if (error) throw new Error(error.message);

    return NextResponse.json({ success: true, contract: data });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
