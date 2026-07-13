import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { z } from 'zod';
import { PDFDocument } from 'pdf-lib';
import crypto from 'crypto';
import { handleApiError } from '@/lib/logger';
import { checkRateLimit } from '@/lib/rate-limit';

export const maxDuration = 60;
export const dynamic = 'force-dynamic';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const requestSchema = z.object({
  userId: z.string().min(1, 'User ID is required'),
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

    const body = await request.json();
    const parsed = requestSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Invalid request', details: parsed.error.format() },
        { status: 400 }
      );
    }

    const { userId, storagePath } = parsed.data;

    // Verify admin role
    const { data: profile, error: profileError } = await supabaseAdmin
      .from('profiles')
      .select('role, email')
      .eq('id', userId)
      .single();

    if (profileError || !profile || (profile.role !== 'admin' && profile.email !== 'admin@prepwise.com')) {
      return NextResponse.json(
        { error: 'Unauthorized. Admin access required.' },
        { status: 403 }
      );
    }

    // Rate Limiting (Prevent abuse of registering dummy uploads)
    const rateLimit = await checkRateLimit(`register_upload_${userId}`);
    if (!rateLimit.success) {
      return NextResponse.json({ error: 'Too many upload registrations' }, { status: 429 });
    }

    // Download the file from Supabase Storage
    const { data: fileData, error: downloadError } = await supabaseAdmin
      .storage
      .from('pdf_uploads')
      .download(storagePath);

    if (downloadError || !fileData) {
      console.error('Download error:', downloadError);
      return NextResponse.json(
        { error: 'Failed to download the uploaded file from storage. It may have been deleted or corrupted.' },
        { status: 500 }
      );
    }

    const arrayBuffer = await fileData.arrayBuffer();
    
    // Empty check
    if (arrayBuffer.byteLength === 0) {
      await supabaseAdmin.storage.from('pdf_uploads').remove([storagePath]);
      return NextResponse.json(
        { error: 'The uploaded PDF file is completely empty (0 bytes).' },
        { status: 422 }
      );
    }

    // Load PDF using pdf-lib to get page count (fast and handles large files well because it doesn't extract text yet)
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
      return NextResponse.json({ 
        error: 'The PDF is corrupted or invalid.' 
      }, { status: 422 });
    }

    const totalPages = pdfDoc.getPageCount();

    if (totalPages === 0) {
      await supabaseAdmin.storage.from('pdf_uploads').remove([storagePath]);
      return NextResponse.json({ 
        error: 'The PDF has 0 pages.' 
      }, { status: 422 });
    }

    // Calculate chunks
    const uploadId = crypto.randomUUID();
    const jobsToInsert = [];

    for (let i = 0; i < totalPages; i += CHUNK_SIZE) {
      jobsToInsert.push({
        upload_id: uploadId,
        source_file: storagePath,
        chunk_start_page: i + 1, // 1-indexed for humans/reference
        chunk_end_page: Math.min(i + CHUNK_SIZE, totalPages),
        status: 'waiting'
      });
    }

    // Insert jobs into database
    const { error: insertError } = await supabaseAdmin
      .from('processing_jobs')
      .insert(jobsToInsert);

    if (insertError) {
      console.error('Failed to insert processing jobs:', insertError);
      await supabaseAdmin.storage.from('pdf_uploads').remove([storagePath]);
      return NextResponse.json(
        { error: 'Database error while creating processing jobs.' },
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
    const errorResponse = handleApiError('/api/register-upload', err);
    return NextResponse.json(errorResponse, { status: 500 });
  }
}
