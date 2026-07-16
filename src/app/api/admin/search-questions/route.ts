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
    const search = searchParams.get('search') || '';
    const difficulty = searchParams.get('difficulty') || '';

    let query = supabaseAdmin.from('questions').select('*', { count: 'exact' });

    if (search.trim()) {
      // Format search string into tsquery format: word1 & word2 & word3:*
      const words = search.trim().split(/\s+/).map(w => `${w}:*`);
      const tsQuery = words.join(' & ');
      query = query.textSearch('fts', tsQuery);
    }

    if (difficulty && difficulty !== 'all') {
      query = query.eq('difficulty', difficulty.toLowerCase());
    }

    query = query.order('created_at', { ascending: false }).range(page * 50, (page + 1) * 50 - 1);

    const { data, count, error } = await query;

    if (error) {
      if (error.message.includes('column "fts" does not exist')) {
        return NextResponse.json({ error: 'Full-Text Search not configured. Please run the setup_phase4.sql script in your Supabase SQL Editor.' }, { status: 500 });
      }
      throw new Error(error.message);
    }

    return NextResponse.json({ questions: data, totalCount: count });

  } catch (err: unknown) {
    const errorResponse = handleApiError('/api/admin/search-questions', err);
    return NextResponse.json(errorResponse, { status: 500 });
  }
}
