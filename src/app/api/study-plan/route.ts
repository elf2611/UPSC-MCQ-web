import { NextRequest, NextResponse } from "next/server";
import { verifyUserToken, getSupabaseAdmin } from "@/lib/auth-verify";

export async function GET(req: NextRequest) {
  try {
    const authRes = await verifyUserToken(req);
    if (!authRes.ok) {
      return NextResponse.json({ error: authRes.error }, { status: 401 });
    }

    const userId = authRes.uid;
    const supabaseAdmin = getSupabaseAdmin();

    const today = new Date();
    const dayOfWeek = today.getDay();
    const diffToMonday = today.getDate() - dayOfWeek + (dayOfWeek === 0 ? -6 : 1);
    const monday = new Date(today.setDate(diffToMonday));
    monday.setHours(0, 0, 0, 0);
    const weekStartDateStr = monday.toISOString().split('T')[0];

    const { data: plan } = await supabaseAdmin
      .from('study_plans')
      .select('id')
      .eq('user_id', userId)
      .eq('week_start_date', weekStartDateStr)
      .single();

    if (!plan) {
      return NextResponse.json({ days: [] }, { status: 404 });
    }

    const { data: days } = await supabaseAdmin
      .from('study_plan_days')
      .select('*')
      .eq('plan_id', plan.id)
      .order('day_date', { ascending: true });

    return NextResponse.json({ days: days || [] });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Server Error" }, { status: 500 });
  }
}
