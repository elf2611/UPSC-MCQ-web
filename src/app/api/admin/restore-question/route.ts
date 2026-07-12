import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { handleApiError, logger } from '@/lib/logger';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(request: NextRequest) {
  try {
    const { userId, historyId } = await request.json();

    if (!userId || !historyId) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const { data: profile } = await supabaseAdmin
      .from('profiles')
      .select('role')
      .eq('id', userId)
      .single();

    if (!profile || profile.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // 1. Fetch history record
    const { data: historyRecord, error: historyError } = await supabaseAdmin
      .from('question_history')
      .select('*')
      .eq('id', historyId)
      .single();

    if (historyError || !historyRecord) {
      return NextResponse.json({ error: 'History record not found' }, { status: 404 });
    }

    const questionId = historyRecord.question_id;

    // 2. Fetch current question state to save as a new history record (so undo is undoable)
    const { data: currentQuestion } = await supabaseAdmin
      .from('questions')
      .select('*')
      .eq('id', questionId)
      .single();

    if (currentQuestion) {
      await supabaseAdmin.from('question_history').insert([{
        question_id: questionId,
        previous_data: currentQuestion,
        edited_by: userId
      }]);
    }

    // 3. Restore the old data
    // Remove the 'id' and 'created_at' from previous_data just to be safe, we don't want to overwrite primary keys
    const restoreData = { ...historyRecord.previous_data, updated_at: new Date().toISOString() };
    delete restoreData.id;
    delete restoreData.created_at;

    const { error: updateError } = await supabaseAdmin
      .from('questions')
      .update(restoreData)
      .eq('id', questionId);

    if (updateError) {
      throw new Error(updateError.message);
    }

    logger.info({ event_type: 'question_restored', questionId, historyId, adminId: userId });

    return NextResponse.json({ success: true });

  } catch (err: unknown) {
    const errorResponse = handleApiError('/api/admin/restore-question', err);
    return NextResponse.json(errorResponse, { status: 500 });
  }
}
