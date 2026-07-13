import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { z } from 'zod';
import { handleApiError } from '@/lib/logger';
import { checkRateLimit } from '@/lib/rate-limit';
import { verifyAdminToken } from '@/lib/auth-verify';

export const dynamic = 'force-dynamic';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const MAX_PAYLOAD_SIZE = 10 * 1024; // 10KB — just a small JSON payload
const MAX_FILE_SIZE_BYTES = 150 * 1024 * 1024; // 150MB

const requestSchema = z.object({
  fileName: z.string().min(1, 'File name is required'),
  contentType: z.enum(['application/pdf']).default('application/pdf'),
  fileSize: z.number().positive('File size must be positive').optional(),
});

export async function POST(request: NextRequest) {
  try {
    // 1. Enforce payload size (this is the JSON body, not the actual file)
    const contentLength = Number(request.headers.get('content-length') || 0);
    if (contentLength > MAX_PAYLOAD_SIZE) {
      return NextResponse.json({ error: 'Payload too large' }, { status: 413 });
    }

    // 2. Verify admin via Firebase ID token (Authorization: Bearer <token>)
    const authResult = await verifyAdminToken(request);
    if (!authResult.ok) {
      return NextResponse.json(
        {
          error: authResult.error,
          detail: process.env.NODE_ENV === 'development' ? authResult.detail : undefined,
        },
        { status: authResult.status }
      );
    }

    const { uid } = authResult;

    // 3. Validate request body
    const body = await request.json();
    const parsed = requestSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Invalid request', details: parsed.error.format() },
        { status: 400 }
      );
    }

    const { fileName, fileSize } = parsed.data;

    // 4. Enforce 150MB file size limit (client sends this so we can reject early)
    if (fileSize !== undefined && fileSize > MAX_FILE_SIZE_BYTES) {
      const fileSizeMB = (fileSize / (1024 * 1024)).toFixed(1);
      return NextResponse.json(
        {
          error: `File too large (${fileSizeMB} MB). Maximum allowed size is 150 MB.`,
        },
        { status: 413 }
      );
    }

    // 5. Rate Limiting (prevent abuse of signed URL generation)
    const rateLimit = await checkRateLimit(`upload_url_${uid}`);
    if (!rateLimit.success) {
      return NextResponse.json({ error: 'Too many upload requests. Please wait a moment.' }, { status: 429 });
    }

    // 6. Generate signed upload URL
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
      throw new Error(`Failed to create signed URL: ${uploadError?.message ?? 'Unknown storage error'}`);
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
