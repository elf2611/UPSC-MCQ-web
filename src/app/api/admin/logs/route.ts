import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { handleApiError } from '@/lib/logger';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');
    const page = parseInt(searchParams.get('page') || '0', 10);
    const type = searchParams.get('type') || '';
    const dateFrom = searchParams.get('dateFrom') || '';

    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { data: profile } = await supabaseAdmin
      .from('profiles')
      .select('role, email')
      .eq('id', userId)
      .single();

    if (!profile || (profile.role !== 'admin' && profile.email !== 'admin@prepwise.com')) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

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
