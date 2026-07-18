import { NextRequest, NextResponse } from 'next/server';
import { verifyAdminToken, getSupabaseAdmin } from '@/lib/auth-verify';
import * as z from 'zod';

export const dynamic = 'force-dynamic';

const subjectSchema = z.object({
  name: z.string().min(1),
  slug: z.string().min(1),
  color: z.string().optional().nullable(),
  icon: z.string().optional().nullable(),
});

export async function POST(request: NextRequest) {
  try {
    const authResult = await verifyAdminToken(request);
    if (!authResult.ok) {
      return NextResponse.json({ error: authResult.error, detail: authResult.detail }, { status: authResult.status });
    }

    const payload = await request.json();
    const validatedData = subjectSchema.parse(payload);

    const supabaseAdmin = getSupabaseAdmin();
    const { data, error } = await supabaseAdmin
      .from('subjects')
      .insert([validatedData])
      .select()
      .single();

    if (error) throw new Error(error.message);

    return NextResponse.json({ success: true, data });
  } catch (error: unknown) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Validation Error', details: error.issues }, { status: 400 });
    }
    const message = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
