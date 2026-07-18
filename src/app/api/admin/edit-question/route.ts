import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/auth-verify';
import { handleApiError, logger } from '@/lib/logger';
import { verifyAdminToken } from '@/lib/auth-verify';

export const dynamic = 'force-dynamic';



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
    const { uid: userId } = authResult;

    const { questionId, updates } = await request.json();

    if (!questionId || !updates) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // 1. Fetch current question state
    const { data: currentQuestion, error: fetchError } = await supabaseAdmin
      .from('questions')
      .select('*')
      .eq('id', questionId)
      .single();

    if (fetchError || !currentQuestion) {
      return NextResponse.json({ error: 'Question not found' }, { status: 404 });
    }

    // 2. Save current state to question_history
    const { error: historyError } = await supabaseAdmin
      .from('question_history')
      .insert([{
        question_id: questionId,
        previous_data: currentQuestion,
        edited_by: userId
      }]);

    if (historyError) {
      logger.error({ event_type: 'history_save_failed', error: historyError, questionId });
      return NextResponse.json({ error: 'Failed to save version history' }, { status: 500 });
    }

    // 3. Update the question
    const { error: updateError } = await supabaseAdmin
      .from('questions')
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('id', questionId);

    if (updateError) {
      // If update fails, we might have a dangling history record, which is harmless but worth noting.
      throw new Error(updateError.message);
    }

    logger.info({ event_type: 'question_edited', questionId, adminId: userId });

    return NextResponse.json({ success: true });

  } catch (err: unknown) {
    const errorResponse = handleApiError('/api/admin/edit-question', err);
    return NextResponse.json(errorResponse, { status: 500 });
  }
}
