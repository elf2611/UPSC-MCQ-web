import { createClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()

    const { userId, score, totalMarks, correctCount, wrongCount,
      unattemptedCount, accuracyPercent, timeTakenSeconds,
      startedAt, mode, testId } = body

    if (!userId) {
      return NextResponse.json({ error: 'userId is required' }, { status: 400 })
    }

    // Insert attempt using service role (bypasses schema cache + RLS)
    const { data: attemptData, error: attemptError } = await supabaseAdmin
      .from('test_attempts')
      .insert({
        user_id: userId,
        test_id: testId || null,
        mode: mode || 'practice',
        score: score ?? 0,
        total_marks: totalMarks ?? 0,
        correct_count: correctCount ?? 0,
        wrong_count: wrongCount ?? 0,
        unattempted_count: unattemptedCount ?? 0,
        accuracy_percent: accuracyPercent ?? 0,
        time_taken_seconds: timeTakenSeconds ?? 0,
        started_at: startedAt || new Date().toISOString(),
        submitted_at: new Date().toISOString(),
      })
      .select('id')
      .single()

    if (attemptError || !attemptData) {
      console.error('test_attempts insert error:', attemptError)
      return NextResponse.json(
        { error: attemptError?.message || 'Failed to insert attempt' },
        { status: 500 }
      )
    }

    const attemptId = attemptData.id

    // Insert attempt_answers if provided
    if (body.answerRows && Array.isArray(body.answerRows) && body.answerRows.length > 0) {
      const rows = body.answerRows.map((r: Record<string, unknown>) => ({
        attempt_id: attemptId,
        question_id: r.question_id,
        selected_option: r.selected_option || null,
        is_correct: r.is_correct ?? false,
        time_spent_seconds: r.time_spent_seconds ?? 0,
        marked_for_review: r.marked_for_review ?? false,
      }))

      const { error: answersError } = await supabaseAdmin
        .from('attempt_answers')
        .insert(rows)

      if (answersError) {
        // Non-fatal — log but still return the attempt id
        console.error('attempt_answers insert error (non-fatal):', answersError)
      }
    }

    return NextResponse.json({ attemptId })
  } catch (err) {
    console.error('submit-test route error:', err)
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
