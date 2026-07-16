import { createClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { handleApiError } from '@/lib/logger';
import { checkRateLimit } from '@/lib/rate-limit';

import { verifyAdminToken } from '@/lib/auth-verify';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const MAX_PAYLOAD_SIZE = 5 * 1024 * 1024; // 5MB max since we might get hundreds of questions

const questionSchema = z.object({
  question_text: z.string().min(1),
  option_a: z.string().min(1),
  option_b: z.string().min(1),
  option_c: z.string().min(1),
  option_d: z.string().min(1),
  correct_option: z.enum(['a', 'b', 'c', 'd', 'A', 'B', 'C', 'D']),
  explanation: z.string().default(''),
}).passthrough(); // Allow extra extended fields

const payloadSchema = z.object({
  questions: z.array(z.any()),
});

function chunkArray<T>(arr: T[], size: number): T[][] {
  const chunks = [];
  for (let i = 0; i < arr.length; i += size) {
    chunks.push(arr.slice(i, i + size));
  }
  return chunks;
}

export async function POST(request: NextRequest) {
  try {
    const authResult = await verifyAdminToken(request);
    if (!authResult.ok) {
      return NextResponse.json(
        { error: authResult.error, detail: authResult.detail },
        { status: authResult.status }
      );
    }
    const userId = authResult.uid;

    // 1. Enforce payload size
    const contentLength = Number(request.headers.get('content-length') || 0);
    if (contentLength > MAX_PAYLOAD_SIZE) {
      return NextResponse.json({ error: 'Payload too large (max 5MB)' }, { status: 413 });
    }

    const body = await request.json();

    // 2. Validate Root Payload
    const parsed = payloadSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid payload', details: parsed.error.format() }, { status: 400 });
    }
    const { questions } = parsed.data;

    const rateLimit = await checkRateLimit(`save_questions_${userId}`);
    if (!rateLimit.success) {
      return NextResponse.json({ error: 'Too many requests' }, { status: 429 });
    }

    // 4. Validate and build valid questions array
    const validQuestions = [];
    const results = { saved: 0, failed: 0, errors: [] as string[] };

    for (let i = 0; i < questions.length; i++) {
      const q = questions[i];
      const parsedQ = questionSchema.safeParse(q);

      if (!parsedQ.success) {
        results.failed++;
        results.errors.push(`Q${i + 1}: ${parsedQ.error.issues[0].path} - ${parsedQ.error.issues[0].message}`);
        continue;
      }

      const row = {
        question_text:  String(q.question_text).trim(),
        option_a:       String(q.option_a).trim(),
        option_b:       String(q.option_b).trim(),
        option_c:       String(q.option_c).trim(),
        option_d:       String(q.option_d).trim(),
        correct_option: String(q.correct_option).toLowerCase().trim(),
        explanation:    String(q.explanation || '').trim(),
        difficulty:     String(q.difficulty || 'medium').toLowerCase().trim(),
        subject:        String(q.subject || '').trim(),
        topic:          String(q.topic || '').trim(),
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
        created_by:        userId,
      };

      validQuestions.push(row);
    }

    if (validQuestions.length === 0) {
      return NextResponse.json({ ...results, error: 'No valid questions to save.' }, { status: 400 });
    }

    // 5. Atomic Batch Inserts (Chunks of 500)
    // In PostgREST, a bulk insert of an array is wrapped in a single transaction automatically.
    const chunks = chunkArray(validQuestions, 500);

    for (let c = 0; c < chunks.length; c++) {
      const chunk = chunks[c];
      const { error: insertError } = await supabaseAdmin.from('questions').insert(chunk);

      if (insertError) {
        // If a batch fails, the entire chunk is rolled back naturally by Postgres
        results.failed += chunk.length;
        results.errors.push(`Batch ${c + 1} failed: ${insertError.message}`);
      } else {
        results.saved += chunk.length;
      }
    }

    return NextResponse.json(results);

  } catch (err: unknown) {
    const errorResponse = handleApiError('/api/admin/save-questions', err);
    return NextResponse.json(errorResponse, { status: 500 });
  }
}
