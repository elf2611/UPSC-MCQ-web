import { getSupabaseAdmin } from '@/lib/auth-verify';
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { handleApiError } from '@/lib/logger';
import { verifyAdminToken } from '@/lib/auth-verify';

export const dynamic = 'force-dynamic';

const rejectSchema = z.object({
  ids: z.array(z.string().uuid()),
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

    const body = await request.json();
    const parsed = rejectSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid payload', details: parsed.error.format() }, { status: 400 });
    }

    const { ids } = parsed.data;
    if (!ids || ids.length === 0) {
      return NextResponse.json({ error: 'No IDs provided' }, { status: 400 });
    }

    // Delete from staged_questions
    const { error: deleteError } = await supabaseAdmin
      .from('staged_questions')
      .delete()
      .in('id', ids);

    if (deleteError) throw deleteError;

    return NextResponse.json({ success: true, count: ids.length });
  } catch (err: unknown) {
    const errorResponse = handleApiError('/api/admin/staged-questions/reject', err);
    return NextResponse.json(errorResponse, { status: 500 });
  }
}
