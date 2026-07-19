import { getSupabaseAdmin } from '@/lib/auth-verify';
import { NextRequest, NextResponse } from 'next/server';
import { handleApiError } from '@/lib/logger';
import { verifyAdminToken } from '@/lib/auth-verify';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const authResult = await verifyAdminToken(request);
    if (!authResult.ok) {
      return NextResponse.json(
        { error: authResult.error, detail: authResult.detail },
        { status: authResult.status }
      );
    }

    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status') || 'pending';
    const source = searchParams.get('source');

    const supabaseAdmin = getSupabaseAdmin();

    let query = supabaseAdmin
      .from('staged_questions')
      .select('*')
      .eq('status', status)
      .order('created_at', { ascending: false });

    if (source) {
      query = query.eq('source', source);
    }

    const { data, error } = await query;

    if (error) {
      throw error;
    }

    return NextResponse.json({ data });

  } catch (err: unknown) {
    const errorResponse = handleApiError('/api/admin/staged-questions', err);
    return NextResponse.json(errorResponse, { status: 500 });
  }
}
