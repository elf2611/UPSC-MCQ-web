import { NextRequest, NextResponse } from "next/server";
import { verifyUserToken, getSupabaseAdmin } from "@/lib/auth-verify";

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    // 1. Verify caller is authenticated
    const authResult = await verifyUserToken(request);
    if (!authResult.ok) {
      return NextResponse.json(
        { error: authResult.error, detail: authResult.detail },
        { status: authResult.status }
      );
    }

    const { searchParams } = new URL(request.url);
    const attemptId = searchParams.get("attempt_id");

    if (!attemptId) {
      return NextResponse.json({ error: "Missing attempt_id parameter" }, { status: 400 });
    }

    const uid = authResult.uid;
    const supabaseAdmin = getSupabaseAdmin();

    // 2. Fetch the attempt, bypassing RLS but enforcing ownership in the query
    const { data: attemptData, error: attemptError } = await supabaseAdmin
      .from("test_attempts")
      .select("*")
      .eq("id", attemptId)
      .eq("user_id", uid)
      .single();

    if (attemptError || !attemptData) {
      return NextResponse.json(
        { error: attemptError?.message || "Results not found or unauthorized." },
        { status: 404 }
      );
    }

    // 3. Fetch the answers for this attempt
    const { data: answersData, error: answersError } = await supabaseAdmin
      .from("attempt_answers")
      .select(`
        id,
        question_id,
        selected_option,
        is_correct,
        marked_for_review,
        questions (
          id,
          question_text,
          option_a,
          option_b,
          option_c,
          option_d,
          correct_option,
          explanation,
          why_a_wrong,
          why_b_wrong,
          why_c_wrong,
          why_d_wrong,
          elimination_tip,
          static_topic_link,
          subject,
          topic
        )
      `)
      .eq("attempt_id", attemptId)
      .order("id");

    if (answersError) {
      return NextResponse.json(
        { error: "Failed to load attempt answers.", detail: answersError.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      attempt: attemptData,
      answers: answersData || []
    });

  } catch (error: unknown) {
    console.error("Error in get-result route:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
