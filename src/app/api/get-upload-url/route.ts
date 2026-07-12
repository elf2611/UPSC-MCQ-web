import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { z } from 'zod';
import { handleApiError } from '@/lib/logger';
import { checkRateLimit } from '@/lib/rate-limit';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const MAX_PAYLOAD_SIZE = 10 * 1024; // 10KB (just a small JSON payload)

const requestSchema = z.object({
  userId: z.string().min(1, 'User ID is required'),
  fileName: z.string().min(1, 'File name is required'),
  contentType: z.enum(['application/pdf']).default('application/pdf'), // Strictly enforce PDF MIME
});

export async function POST(request: NextRequest) {
  try {
    // 1. Enforce payload size
    const contentLength = Number(request.headers.get('content-length') || 0);
    if (contentLength > MAX_PAYLOAD_SIZE) {
      return NextResponse.json({ error: 'Payload too large' }, { status: 413 });
    }

    const body = await request.json();

    // 2. Validate Input
    const parsed = requestSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Invalid request', details: parsed.error.format() },
        { status: 400 }
      );
    }

    const { userId, fileName } = parsed.data;

    // 3. Admin Verification
    const { data: profile, error: profileError } = await supabaseAdmin
      .from('profiles')
      .select('role')
      .eq('id', userId)
      .single();

    if (profileError || !profile || profile.role !== 'admin') {
      return NextResponse.json(
        { error: 'Unauthorized. Admin access required.' },
        { status: 403 }
      );
    }

    // 4. Rate Limiting (Prevent abuse of signed URLs)
    const rateLimit = await checkRateLimit(`upload_url_${userId}`);
    if (!rateLimit.success) {
      return NextResponse.json({ error: 'Too many upload requests' }, { status: 429 });
    }

    // 5. Generate signed URL
    const fileExt = fileName.split('.').pop() || 'pdf';
    const uniqueFileName = `${Date.now()}_${Math.random().toString(36).substring(7)}.${fileExt}`;
    const storagePath = `uploads/${uniqueFileName}`;

    const { data: uploadData, error: uploadError } = await supabaseAdmin
      .storage
      .from('pdf_uploads')
      .createSignedUploadUrl(storagePath, {
        upsert: false,
      });

    if (uploadError || !uploadData) {
      throw new Error(`Failed to create signed URL: ${uploadError.message}`);
    }

    return NextResponse.json({
      uploadUrl: uploadData.signedUrl,
      storagePath,
    });
    
  } catch (err: unknown) {
    const errorResponse = handleApiError('/api/get-upload-url', err);
    return NextResponse.json(errorResponse, { status: 500 });
  }
}
