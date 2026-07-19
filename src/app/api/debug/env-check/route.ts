import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  // Protect with CRON_SECRET same as current affairs
  const authHeader = request.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const key = process.env.SUPABASE_SERVICE_ROLE_KEY ?? '';
  let role = 'UNKNOWN';
  try {
    const payload = JSON.parse(Buffer.from(key.split('.')[1], 'base64').toString());
    role = payload.role ?? 'NO ROLE FIELD';
  } catch (e) {
    role = 'DECODE FAILED';
  }
  
  return NextResponse.json({ role, keyLength: key.length });
}
