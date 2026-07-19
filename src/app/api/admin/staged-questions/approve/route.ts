import { getSupabaseAdmin } from '@/lib/auth-verify';
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { handleApiError } from '@/lib/logger';
import { verifyAdminToken } from '@/lib/auth-verify';

export const dynamic = 'force-dynamic';

const approveSchema = z.object({
  questions: z.array(z.any()), // Array of edited/original staged_questions rows
});

export async function POST(request: NextRequest) {
  const supabaseAdmin = getSupabaseAdmin();
  try {
    const authResult = await verifyAdminToken(request);
    if (!authResult.ok) {
      return NextResponse.json(
        { error: authResult.error, detail: authResult.detail },
        { status: authResult.status }
      );
    }
    const userId = authResult.uid;

    const body = await request.json();
    const parsed = approveSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid payload', details: parsed.error.format() }, { status: 400 });
    }

    const { questions } = parsed.data;
    if (!questions || questions.length === 0) {
      return NextResponse.json({ error: 'No questions provided' }, { status: 400 });
    }

    const rowsToInsert = [];
    const idsToDelete = [];

    for (const q of questions) {
      if (!q.id) continue;
      
      const row = {
        question_text:  String(q.question_text || '').trim(),
        option_a:       String(q.option_a || '').trim(),
        option_b:       String(q.option_b || '').trim(),
        option_c:       String(q.option_c || '').trim(),
        option_d:       String(q.option_d || '').trim(),
        correct_option: String(q.correct_option || '').toLowerCase().trim(),
        explanation:    String(q.explanation || '').trim(),
        difficulty:     String(q.difficulty || 'medium').toLowerCase().trim(),
        subject:        String(q.subject || '').trim(),
        topic:          String(q.topic || '').trim(),
        subtopic:       String(q.subtopic || '').trim(),
        why_a_wrong:    String(q.why_a_wrong || '').trim(),
        why_b_wrong:    String(q.why_b_wrong || '').trim(),
        why_c_wrong:    String(q.why_c_wrong || '').trim(),
        why_d_wrong:    String(q.why_d_wrong || '').trim(),
        elimination_tip:String(q.elimination_tip || '').trim(),
        source:         String(q.source || 'original'),
        year:           q.year ? Number(q.year) : null,
        language:       String(q.language || 'en'),
        created_by:     userId,
        article_date:   q.article_date ? String(q.article_date) : null,
        // Carry over the hash from staged so we don't accidentally re-import the exact same PDF question
        // question_hash isn't strictly enforced on live yet in all cases, but if it's there we keep it.
        // Actually, let's omit hash mapping for now unless we need to. 
      };

      rowsToInsert.push(row);
      idsToDelete.push(q.id);
    }

    if (rowsToInsert.length === 0) {
      return NextResponse.json({ error: 'No valid questions to approve.' }, { status: 400 });
    }

    // Insert into live questions table
    const { error: insertError } = await supabaseAdmin.from('questions').insert(rowsToInsert);
    if (insertError) throw insertError;

    // Delete from staged_questions
    const { error: deleteError } = await supabaseAdmin
      .from('staged_questions')
      .delete()
      .in('id', idsToDelete);
    if (deleteError) throw deleteError;

    return NextResponse.json({ success: true, count: rowsToInsert.length });
  } catch (err: unknown) {
    const errorResponse = handleApiError('/api/admin/staged-questions/approve', err);
    return NextResponse.json(errorResponse, { status: 500 });
  }
}
