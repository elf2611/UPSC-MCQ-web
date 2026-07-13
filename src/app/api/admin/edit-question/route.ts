import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { handleApiError, logger } from '@/lib/logger';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(request: NextRequest) {
  try {
    const { userId, questionId, updates } = await request.json();

    if (!userId || !questionId || !updates) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Verify Admin
    const { data: profile } = await supabaseAdmin
      .from('profiles')
      .select('role, email')
      .eq('id', userId)
      .single();

    if (!profile || (profile.role !== 'admin' && profile.email !== 'admin@prepwise.com')) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
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
