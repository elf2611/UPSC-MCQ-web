import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { z } from 'zod';
import { handleApiError } from '@/lib/logger';
import { checkRateLimit } from '@/lib/rate-limit';
import { verifyUserToken } from '@/lib/auth-verify';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const MAX_PAYLOAD_SIZE = 500 * 1024; // 500KB

const answerRowSchema = z.object({
  question_id: z.string().uuid(),
  selected_option: z.string().nullable().optional(),
  time_spent_seconds: z.number().default(0),
  marked_for_review: z.boolean().default(false),
  // We ignore is_correct from the client completely
});

const submitSchema = z.object({
  userId: z.string().min(1, 'User ID is required'),
  testId: z.string().uuid().optional(),
  mode: z.enum(['practice', 'exam']).default('practice'),
  source_section: z.string().optional(),
  startedAt: z.string().optional(),
  timeTakenSeconds: z.number().default(0),
  answerRows: z.array(answerRowSchema).default([]),
});

export async function POST(request: NextRequest) {
  try {
    // 0. Verify Auth Token
    const authResult = await verifyUserToken(request);
    if (!authResult.ok) {
      return NextResponse.json(
        { error: authResult.error, detail: authResult.detail },
        { status: authResult.status }
      );
    }

    // 1. Payload Size Check
    const contentLength = Number(request.headers.get('content-length') || 0);
    if (contentLength > MAX_PAYLOAD_SIZE) {
      return NextResponse.json({ error: 'Payload too large' }, { status: 413 });
    }

    const body = await request.json();

    // 2. Validate Input
    const parsed = submitSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Invalid payload', details: parsed.error.format() },
        { status: 400 }
      );
    }

    const { userId, testId, mode, source_section, startedAt, timeTakenSeconds, answerRows } = parsed.data;

    if (userId !== authResult.uid) {
      return NextResponse.json({ error: 'Unauthorized user mismatch' }, { status: 403 });
    }

    // 3. Rate Limiting
    const rateLimit = await checkRateLimit(`submit_${userId}`);
    if (!rateLimit.success) {
      return NextResponse.json({ error: 'Too many requests' }, { status: 429 });
    }

    // 4. Server-Side Score Calculation
    let correctCount = 0;
    let wrongCount = 0;
    let unattemptedCount = 0;
    const totalMarks = answerRows.length * 2; // Assuming 2 marks per question

    // We need to fetch the actual correct answers
    const questionIds = answerRows.map(r => r.question_id);
    
    // Create a map to securely store correct_options fetched from DB
    const correctOptionsMap = new Map<string, string>();

    if (questionIds.length > 0) {
      // Fetch in chunks of 500 to avoid huge IN clauses, but typically test is < 200 Qs
      const { data: dbQuestions, error: fetchError } = await supabaseAdmin
        .from('questions')
        .select('id, correct_option')
        .in('id', questionIds);

      if (fetchError) throw new Error(`Failed to verify answers: ${fetchError.message}`);

      for (const q of dbQuestions) {
        correctOptionsMap.set(q.id, q.correct_option.toLowerCase());
      }
    }

    // Grade each row
    const gradedAnswers = answerRows.map(r => {
      let isCorrect = false;
      const trueAnswer = correctOptionsMap.get(r.question_id);

      if (!r.selected_option || String(r.selected_option).trim() === '') {
        unattemptedCount++;
      } else if (trueAnswer && String(r.selected_option).toLowerCase() === trueAnswer) {
        correctCount++;
        isCorrect = true;
      } else {
        wrongCount++;
      }

      return {
        ...r,
        is_correct: isCorrect,
      };
    });

    const score = mode === 'exam' 
      ? (correctCount * 2) - (wrongCount * 0.66)
      : (correctCount * 2); // No negative marking in practice mode
    const accuracyPercent = (correctCount + wrongCount) > 0 
      ? (correctCount / (correctCount + wrongCount)) * 100 
      : 0;

    // 5. Atomic Insertion using RPC
    const { data: attemptId, error: rpcError } = await supabaseAdmin.rpc('submit_test_attempt', {
      p_user_id: userId,
      p_test_id: testId || null,
      p_mode: source_section || mode,
      p_score: score,
      p_total_marks: totalMarks,
      p_correct_count: correctCount,
      p_wrong_count: wrongCount,
      p_unattempted_count: unattemptedCount,
      p_accuracy_percent: accuracyPercent,
      p_time_taken_seconds: timeTakenSeconds,
      p_started_at: startedAt || new Date().toISOString(),
      p_answers: gradedAnswers,
    });

    if (rpcError) {
      throw new Error(`Failed to commit test submission: ${rpcError.message}`);
    }

    // 6. Auto-populate Revision Queue for wrong answers
    const wrongAnswers = gradedAnswers.filter(a => a.is_correct === false);
    if (wrongAnswers.length > 0) {
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      const next_review_date = tomorrow.toISOString().split('T')[0];

      const revisionRows = wrongAnswers.map(r => ({
        user_id: userId,
        question_id: r.question_id,
        next_review_date,
        interval_days: 1,
        ease_factor: 2.5,
        repetitions: 0
      }));

      const { error: revisionError } = await supabaseAdmin
        .from('revision_queue')
        .upsert(revisionRows, { 
          onConflict: 'user_id,question_id',
          ignoreDuplicates: true 
        });

      if (revisionError) {
        console.error('Failed to upsert to revision_queue:', revisionError);
      }
    }

    return NextResponse.json({ attemptId });

  } catch (err: unknown) {
    const errorResponse = handleApiError('/api/submit-test', err);
    return NextResponse.json(errorResponse, { status: 500 });
  }
}
