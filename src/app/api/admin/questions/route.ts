import { NextRequest, NextResponse } from 'next/server';
import { verifyAdminToken, getSupabaseAdmin } from '@/lib/auth-verify';
import * as z from 'zod';

export const dynamic = 'force-dynamic';

const questionSchema = z.object({
  id: z.string().optional(),
  text: z.string().min(1),
  option_a: z.string().min(1),
  option_b: z.string().min(1),
  option_c: z.string().min(1),
  option_d: z.string().min(1),
  correct_answer: z.enum(['A', 'B', 'C', 'D']),
  explanation: z.string().optional().nullable(),
  subject_id: z.string().uuid().optional().nullable(),
  topic_id: z.string().uuid().optional().nullable(),
  subtopic: z.string().optional().nullable(),
  difficulty: z.string().optional().nullable(),
  source: z.string().optional().nullable(),
  status: z.enum(['staged', 'approved', 'rejected']).optional(),
  why_a_wrong: z.string().optional().nullable(),
  why_b_wrong: z.string().optional().nullable(),
  why_c_wrong: z.string().optional().nullable(),
  why_d_wrong: z.string().optional().nullable(),
  elimination_tip: z.string().optional().nullable(),
  memory_trick: z.string().optional().nullable(),
  static_topic_link: z.string().optional().nullable(),
  related_current_affairs: z.string().optional().nullable(),
  estimated_solving_time: z.number().optional().nullable(),
  revision_priority: z.string().optional().nullable(),
  year: z.number().optional().nullable(),
  article_date: z.string().optional().nullable(),
  tags: z.array(z.string()).optional().nullable(),
  language: z.string().optional().nullable(),
  created_by: z.string().optional().nullable(),
});

export async function POST(request: NextRequest) {
  try {
    const authResult = await verifyAdminToken(request);
    if (!authResult.ok) {
      return NextResponse.json({ error: authResult.error, detail: authResult.detail }, { status: authResult.status });
    }

    const payload = await request.json();
    const validatedData = questionSchema.parse(payload);
    
    // Default status is 'approved' for questions created manually by admin
    if (!validatedData.status) {
      validatedData.status = 'approved';
    }

    const supabaseAdmin = getSupabaseAdmin();
    const { data, error } = await supabaseAdmin
      .from('questions')
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

export async function DELETE(request: NextRequest) {
  try {
    const authResult = await verifyAdminToken(request);
    if (!authResult.ok) {
      return NextResponse.json({ error: authResult.error, detail: authResult.detail }, { status: authResult.status });
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'Question ID is required' }, { status: 400 });
    }

    const supabaseAdmin = getSupabaseAdmin();
    const { error } = await supabaseAdmin
      .from('questions')
      .delete()
      .eq('id', id);

    if (error) throw new Error(error.message);

    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
