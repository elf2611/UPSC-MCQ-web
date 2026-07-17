import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { handleApiError } from '@/lib/logger';
import { verifyUserToken, getSupabaseAdmin } from '@/lib/auth-verify';
import { checkRateLimit } from '@/lib/rate-limit';

const verifySchema = z.object({
  question_id: z.string().uuid(),
  selected_option: z.string().min(1)
});

export async function POST(request: NextRequest) {
  try {
    // 1. Verify User
    const authResult = await verifyUserToken(request);
    if (!authResult.ok) {
      return NextResponse.json({ error: authResult.error }, { status: authResult.status });
    }
    const userId = authResult.uid;

    // 2. Rate Limit (strict for verify to prevent scraping)
    // Using a separate bucket for verify, e.g., max 30 per minute
    const rateLimit = await checkRateLimit(`verify_${userId}`);
    if (!rateLimit.success) {
      return NextResponse.json({ error: 'Too many requests. Slow down.' }, { status: 429 });
    }

    const body = await request.json();
    const parsed = verifySchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid payload' }, { status: 400 });
    }

    const { question_id, selected_option } = parsed.data;
    const supabaseAdmin = getSupabaseAdmin();

    // 3. Fetch the question details
    const { data: q, error: fetchError } = await supabaseAdmin
      .from('questions')
      .select('id, correct_option, explanation, why_a_wrong, why_b_wrong, why_c_wrong, why_d_wrong, elimination_tip, memory_trick')
      .eq('id', question_id)
      .single();

    if (fetchError || !q) {
      return NextResponse.json({ error: 'Question not found' }, { status: 404 });
    }

    // 4. Record the attempt in question_attempts to prevent free scraping
    const isCorrect = selected_option.toLowerCase().trim() === q.correct_option.toLowerCase().trim();
    const { error: insertError } = await supabaseAdmin
      .from('question_attempts')
      .upsert({
        user_id: userId,
        question_id: question_id,
        is_correct: isCorrect,
        attempt_date: new Date().toISOString().split('T')[0]
      }, { onConflict: 'user_id,question_id' }); // Assuming unique constraint exists

    // If upsert fails because of no unique constraint, we just insert
    if (insertError) {
       await supabaseAdmin.from('question_attempts').insert({
         user_id: userId,
         question_id: question_id,
         is_correct: isCorrect,
       });
    }

    // 5. Return the protected fields
    return NextResponse.json({
      correct_option: q.correct_option,
      explanation: q.explanation,
      why_a_wrong: q.why_a_wrong,
      why_b_wrong: q.why_b_wrong,
      why_c_wrong: q.why_c_wrong,
      why_d_wrong: q.why_d_wrong,
      elimination_tip: q.elimination_tip,
      memory_trick: q.memory_trick
    });

  } catch (err: unknown) {
    const errorResponse = handleApiError('/api/questions/verify', err);
    return NextResponse.json(errorResponse, { status: 500 });
  }
}
