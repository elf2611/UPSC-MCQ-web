import { NextRequest, NextResponse } from 'next/server';
import { verifyUserToken, getSupabaseAdmin } from '@/lib/auth-verify';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const authResult = await verifyUserToken(request);
  if (!authResult.ok) {
    return NextResponse.json({ error: authResult.error }, { status: authResult.status });
  }

  try {
    const supabaseAdmin = getSupabaseAdmin();
    
    // We only need article_date to calculate counts per date
    const { data, error } = await supabaseAdmin
      .from('questions')
      .select('article_date')
      .eq('source', 'current-affairs')
      .not('article_date', 'is', null)
      .order('article_date', { ascending: false });

    if (error) {
      throw new Error(error.message);
    }

    // Group by article_date
    const dateCounts: Record<string, number> = {};
    data?.forEach(q => {
      const dateStr = q.article_date as string;
      if (dateStr) {
        dateCounts[dateStr] = (dateCounts[dateStr] || 0) + 1;
      }
    });

    // Convert to array, sort descending (most recent first)
    const sortedDates = Object.entries(dateCounts)
      .map(([date, count]) => ({ date, count }))
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    // Only return the last 14 days
    const last14Days = sortedDates.slice(0, 14);

    return NextResponse.json({ dates: last14Days });
  } catch (err: unknown) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}
