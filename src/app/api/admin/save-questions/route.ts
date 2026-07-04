import { createClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'

// Service role client — bypasses RLS completely
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
)

export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
  try {
    // Verify service role key is configured
    if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
      return NextResponse.json(
        { error: 'SUPABASE_SERVICE_ROLE_KEY is not configured in environment variables.' },
        { status: 500 }
      )
    }

    const { questions, userId } = await request.json()

    if (!questions || !Array.isArray(questions)) {
      return NextResponse.json(
        { error: 'Invalid questions array' },
        { status: 400 }
      )
    }

    const results = {
      saved: 0,
      failed: 0,
      errors: [] as string[],
    }

    for (let i = 0; i < questions.length; i++) {
      const q = questions[i]

      // Build a clean row — only use columns that definitely exist
      // Core columns (always exist in questions table)
      const row: Record<string, unknown> = {
        question_text:  String(q.question_text || '').trim(),
        option_a:       String(q.option_a || '').trim(),
        option_b:       String(q.option_b || '').trim(),
        option_c:       String(q.option_c || '').trim(),
        option_d:       String(q.option_d || '').trim(),
        correct_option: String(q.correct_option || 'a').toLowerCase().trim(),
        explanation:    String(q.explanation || '').trim(),
        difficulty:     String(q.difficulty || 'medium').toLowerCase().trim(),
        subject:        String(q.subject || '').trim(),
        topic:          String(q.topic || '').trim(),
      }

      // Skip if missing critical fields
      if (!row.question_text || !row.option_a || !row.option_b || 
          !row.option_c || !row.option_d || !row.correct_option) {
        results.failed++
        results.errors.push(`Q${i + 1}: Missing required fields`)
        continue
      }

      // Extended columns — added via supabase_setup.sql
      // Use the column names that match what's actually in the DB
      const extendedFields: Record<string, unknown> = {
        // Support both why_x_wrong (AI format) and option_x_explanation (DB format)
        why_a_wrong:       String(q.why_a_wrong || q.option_a_explanation || '').trim(),
        why_b_wrong:       String(q.why_b_wrong || q.option_b_explanation || '').trim(),
        why_c_wrong:       String(q.why_c_wrong || q.option_c_explanation || '').trim(),
        why_d_wrong:       String(q.why_d_wrong || q.option_d_explanation || '').trim(),
        elimination_tip:   String(q.elimination_tip || '').trim(),
        static_topic_link: String(q.static_topic_link || '').trim(),
        source:            String(q.source || 'original'),
        year:              q.year ? Number(q.year) : null,
        tags:              Array.isArray(q.tags) ? q.tags : [],
        language:          String(q.language || 'en'),
        created_by:        userId || null,
      }

      // Try inserting with extended fields first
      const fullRow = { ...row, ...extendedFields }

      console.log(`[save-questions] Inserting Q${i + 1}:`, JSON.stringify(fullRow, null, 2))

      let { error } = await supabaseAdmin.from('questions').insert(fullRow)

      // If a column doesn't exist yet, fall back to core-only insert
      if (error && (error.message.includes('column') || error.code === 'PGRST204')) {
        console.warn(`[save-questions] Schema fallback for Q${i + 1}:`, error.message)
        const { error: coreError } = await supabaseAdmin.from('questions').insert(row)
        error = coreError
      }

      if (error) {
        console.error(`[save-questions] Q${i + 1} failed:`, error)
        results.failed++
        results.errors.push(`Q${i + 1}: ${error.message}`)
      } else {
        results.saved++
      }
    }

    console.log(`[save-questions] Done: saved=${results.saved} failed=${results.failed}`)
    return NextResponse.json(results)

  } catch (err) {
    console.error('[save-questions] Unexpected error:', err)
    return NextResponse.json(
      { error: 'Server error: ' + String(err) },
      { status: 500 }
    )
  }
}
