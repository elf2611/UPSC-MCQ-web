import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { z } from 'zod';
import { handleApiError } from '@/lib/logger';
import { checkRateLimit } from '@/lib/rate-limit';
import { verifyAdminToken } from '@/lib/auth-verify';

export const dynamic = 'force-dynamic';

const MAX_PAYLOAD_SIZE = 10 * 1024; // 10KB — just the JSON body, not the actual file
const MAX_FILE_SIZE_BYTES = 150 * 1024 * 1024; // 150MB

const requestSchema = z.object({
  fileName: z.string().min(1, 'File name is required'),
  contentType: z.enum(['application/pdf']).default('application/pdf'),
  fileSize: z.number().positive('File size must be positive').optional(),
});

export async function POST(request: NextRequest) {
  try {
    // 1. Enforce JSON payload size
    const contentLength = Number(request.headers.get('content-length') || 0);
    if (contentLength > MAX_PAYLOAD_SIZE) {
      return NextResponse.json({ error: 'Payload too large' }, { status: 413 });
    }

    // 2. Verify admin via Firebase ID token (Authorization: Bearer <token>)
    //    verifyAdminToken never throws — always returns a result object.
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
    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: 'Request body is not valid JSON.' }, { status: 400 });
    }

    const parsed = requestSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Invalid request body', details: parsed.error.format() },
        { status: 400 }
      );
    }

    const { fileName, fileSize } = parsed.data;

    // 4. Enforce 150MB file size limit early (client sends this so we can reject fast)
    if (fileSize !== undefined && fileSize > MAX_FILE_SIZE_BYTES) {
      const fileSizeMB = (fileSize / (1024 * 1024)).toFixed(1);
      return NextResponse.json(
        { error: `File too large (${fileSizeMB} MB). Maximum allowed size is 150 MB.` },
        { status: 413 }
      );
    }

    // 5. Rate limiting
    const rateLimit = await checkRateLimit(`upload_url_${uid}`);
    if (!rateLimit.success) {
      return NextResponse.json(
        { error: 'Too many upload requests. Please wait a moment before trying again.' },
        { status: 429 }
      );
    }

    // 6. Create Supabase service-role client and generate signed upload URL
    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    const fileExt = fileName.split('.').pop() || 'pdf';
    const uniqueFileName = `${Date.now()}_${Math.random().toString(36).substring(7)}.${fileExt}`;
    const storagePath = `uploads/${uniqueFileName}`;

    const { data: uploadData, error: uploadError } = await supabaseAdmin
      .storage
      .from('pdf_uploads')
      .createSignedUploadUrl(storagePath, { upsert: false });

    if (uploadError || !uploadData) {
      throw new Error(`Failed to create signed URL: ${uploadError?.message ?? 'Unknown storage error'}`);
    }

    return NextResponse.json({ uploadUrl: uploadData.signedUrl, storagePath });

  } catch (err: unknown) {
    // Guaranteed JSON fallback — never return an HTML error page
    console.error('[get-upload-url] Unhandled error:', err);
    const errorResponse = handleApiError('/api/get-upload-url', err);
    return NextResponse.json(errorResponse, { status: 500 });
  }
}
