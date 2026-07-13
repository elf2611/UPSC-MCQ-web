import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { z } from 'zod';
import { PDFDocument } from 'pdf-lib';
import crypto from 'crypto';
import { handleApiError } from '@/lib/logger';
import { checkRateLimit } from '@/lib/rate-limit';
import { verifyAdminToken } from '@/lib/auth-verify';

export const maxDuration = 60;
export const dynamic = 'force-dynamic';

const requestSchema = z.object({
  storagePath: z.string().min(1, 'Storage path is required'),
});

const CHUNK_SIZE = 15; // Pages per chunk
const MAX_PAYLOAD_SIZE = 10 * 1024; // 10KB

export async function POST(request: NextRequest) {
  try {
    const contentLength = Number(request.headers.get('content-length') || 0);
    if (contentLength > MAX_PAYLOAD_SIZE) {
      return NextResponse.json({ error: 'Payload too large' }, { status: 413 });
    }

    // 1. Verify admin via Firebase ID token
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

    // 2. Validate body
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

    const { storagePath } = parsed.data;

    // 3. Rate Limiting
    const rateLimit = await checkRateLimit(`register_upload_${uid}`);
    if (!rateLimit.success) {
      return NextResponse.json({ error: 'Too many upload registrations. Please wait.' }, { status: 429 });
    }

    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    // 4. Download the file from Supabase Storage
    const { data: fileData, error: downloadError } = await supabaseAdmin
      .storage
      .from('pdf_uploads')
      .download(storagePath);

    if (downloadError || !fileData) {
      console.error('[register-upload] Download error:', downloadError);
      return NextResponse.json(
        { error: 'Failed to download the uploaded file from storage. It may have been deleted or corrupted.' },
        { status: 500 }
      );
    }

    const arrayBuffer = await fileData.arrayBuffer();

    // 5. Empty file check
    if (arrayBuffer.byteLength === 0) {
      await supabaseAdmin.storage.from('pdf_uploads').remove([storagePath]);
      return NextResponse.json(
        { error: 'The uploaded PDF file is completely empty (0 bytes).' },
        { status: 422 }
      );
    }

    // 6. Load PDF to get page count
    let pdfDoc;
    try {
      pdfDoc = await PDFDocument.load(arrayBuffer, { ignoreEncryption: true });
    } catch (parseErr: unknown) {
      await supabaseAdmin.storage.from('pdf_uploads').remove([storagePath]);
      const errMsg = parseErr instanceof Error ? parseErr.message : String(parseErr);
      if (errMsg.toLowerCase().includes('password') || errMsg.toLowerCase().includes('encrypt')) {
        return NextResponse.json({
          error: 'This PDF is password-protected or encrypted. Please unlock it and try again.'
        }, { status: 422 });
      }
      return NextResponse.json({ error: 'The PDF is corrupted or invalid.' }, { status: 422 });
    }

    const totalPages = pdfDoc.getPageCount();

    if (totalPages === 0) {
      await supabaseAdmin.storage.from('pdf_uploads').remove([storagePath]);
      return NextResponse.json({ error: 'The PDF has 0 pages.' }, { status: 422 });
    }

    // 7. Create chunk jobs
    const uploadId = crypto.randomUUID();
    const jobsToInsert = [];

    for (let i = 0; i < totalPages; i += CHUNK_SIZE) {
      jobsToInsert.push({
        upload_id: uploadId,
        source_file: storagePath,
        chunk_start_page: i + 1,
        chunk_end_page: Math.min(i + CHUNK_SIZE, totalPages),
        status: 'waiting'
      });
    }

    const { error: insertError } = await supabaseAdmin
      .from('processing_jobs')
      .insert(jobsToInsert);

    if (insertError) {
      console.error('[register-upload] Failed to insert processing jobs:', JSON.stringify(insertError, null, 2));
      await supabaseAdmin.storage.from('pdf_uploads').remove([storagePath]);
      return NextResponse.json(
        { 
          error: 'Database error while creating processing jobs.',
          detail: process.env.NODE_ENV === 'development' ? insertError : undefined
        },
        { status: 500 }
      );
    }

    return NextResponse.json({
      uploadId,
      totalPages,
      totalChunks: jobsToInsert.length,
      message: 'Upload registered successfully. Jobs created.'
    });

  } catch (err: unknown) {
    // Guaranteed JSON fallback — never return an HTML error page
    console.error('[register-upload] Unhandled error:', err);
    const errorResponse = handleApiError('/api/register-upload', err);
    return NextResponse.json(errorResponse, { status: 500 });
  }
}
