import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { handleApiError } from '@/lib/logger';
import { verifyAdminToken } from '@/lib/auth-verify';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

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
    const page = parseInt(searchParams.get('page') || '0', 10);
    const type = searchParams.get('type') || '';
    const dateFrom = searchParams.get('dateFrom') || '';

    let query = supabaseAdmin.from('system_logs').select('*', { count: 'exact' });

    if (type && type !== 'all') {
      query = query.eq('event_type', type);
    }
    
    if (dateFrom) {
      // Expecting YYYY-MM-DD
      query = query.gte('created_at', new Date(dateFrom).toISOString());
    }

    query = query.order('created_at', { ascending: false }).range(page * 50, (page + 1) * 50 - 1);

    const { data, count, error } = await query;

    if (error) throw new Error(error.message);

    return NextResponse.json({ logs: data, totalCount: count });

  } catch (err: unknown) {
    const errorResponse = handleApiError('/api/admin/logs', err);
    return NextResponse.json(errorResponse, { status: 500 });
  }
}
