import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  // Protect with CRON_SECRET same as current affairs
  const authHeader = request.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  return NextResponse.json({
    keyLength: process.env.SUPABASE_SERVICE_ROLE_KEY?.length ?? 0,
    keyPrefix: process.env.SUPABASE_SERVICE_ROLE_KEY?.slice(0, 12) ?? 'MISSING',
    supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL ?? 'MISSING',
  });
}
