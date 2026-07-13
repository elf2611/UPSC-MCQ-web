import { SupabaseClient } from '@supabase/supabase-js';
import { z } from 'zod';
import { PDFDocument } from 'pdf-lib';
import { generateQuestions } from '@/lib/ai/provider';
import crypto from 'crypto';

const questionValidationSchema = z.object({
  question_text: z.string().min(1),
  option_a: z.string().min(1),
  option_b: z.string().min(1),
  option_c: z.string().min(1),
  option_d: z.string().min(1),
  correct_option: z.enum(['a', 'b', 'c', 'd', 'A', 'B', 'C', 'D']),
  explanation: z.string().min(1)
}).passthrough();

const updateJobStatus = async (supabaseAdmin: SupabaseClient, jobId: string, message: string) => {
  await supabaseAdmin
    .from('processing_jobs')
    .update({ status_message: message })
    .eq('id', jobId);
};

export async function processChunk(
  supabaseAdmin: SupabaseClient,
  jobId: string,
  userId: string,
  config?: Record<string, unknown>
) {
  // 1. Fetch the job details
  const { data: job, error: jobError } = await supabaseAdmin
    .from('processing_jobs')
    .select('*')
    .eq('id', jobId)
    .single();

  if (jobError || !job) {
    throw new Error('Failed to fetch job details for processing.');
  }

  try {
    // 2. Download the PDF
    await updateJobStatus(supabaseAdmin, jobId, 'Extracting PDF...');
    const { data: fileData, error: downloadError } = await supabaseAdmin
      .storage
      .from('pdf_uploads')
      .download(job.source_file);

    if (downloadError || !fileData) {
      throw new Error('Failed to download source file from storage.');
    }

    const arrayBuffer = await fileData.arrayBuffer();

    // 3. Extract exact pages
    const pdfDoc = await PDFDocument.load(arrayBuffer, { ignoreEncryption: true });
    const chunkPdf = await PDFDocument.create();
    
    const startIdx = job.chunk_start_page - 1; 
    const endIdx = job.chunk_end_page - 1;
    
    const pageIndices = [];
    for (let i = startIdx; i <= endIdx; i++) {
      if (i < pdfDoc.getPageCount()) {
        pageIndices.push(i);
      }
    }

    if (pageIndices.length === 0) {
      throw new Error('Chunk page range is out of bounds for this PDF.');
    }

    const copiedPages = await chunkPdf.copyPages(pdfDoc, pageIndices);
    for (const page of copiedPages) {
      chunkPdf.addPage(page);
    }

    const chunkPdfBytes = await chunkPdf.save();
    const chunkBuffer = Buffer.from(chunkPdfBytes);

    // Parse text
    const pdfParseModule = await import('pdf-parse');
    const pdfParse = (pdfParseModule as Record<string, unknown>).default || pdfParseModule;
    type PdfParseFn = (buffer: Buffer) => Promise<{ text: string }>;
    const pdfData = await (pdfParse as PdfParseFn)(chunkBuffer);
    const extractedText = pdfData.text?.trim() || '';

    if (extractedText.length < 50) {
      throw new Error('Not enough text extracted from these pages (might be images or blank).');
    }

    // 4. Send to Gemini
    await updateJobStatus(supabaseAdmin, jobId, 'Generating Questions (AI)...');
    const aiConfig = config || {
      count: 10,
      difficulty: 'medium',
      subject: 'Auto',
      topic: 'Auto',
      autoGenerateTags: true,
    };

    let generatedQuestions;
    try {
      generatedQuestions = await generateQuestions({ text: extractedText, config: aiConfig });
    } catch (aiError: unknown) {
      if (aiError && typeof aiError === 'object' && 'rawResponse' in aiError) {
        const rawResponse = (aiError as { rawResponse: string }).rawResponse;
        throw new Error(`AI generated malformed JSON. Error: ${(aiError as unknown as Error).message}\n\nRAW OUTPUT:\n${rawResponse}`);
      }
      throw aiError;
    }

    if (!generatedQuestions || generatedQuestions.length === 0) {
      throw new Error('AI returned 0 questions.');
    }

    // 5. Validate JSON and check taxonomy
    await updateJobStatus(supabaseAdmin, jobId, 'Validating JSON...');
    const { data: dbSubjects } = await supabaseAdmin.from('subjects').select('name');
    const { data: dbTopics } = await supabaseAdmin.from('topics').select('name');
    const subjectNames = dbSubjects?.map(s => s.name) || [];
    const topicNames = dbTopics?.map(t => t.name) || [];

    let duplicates = 0;
    const validQuestionsToInsert = [];
    const rejectedQuestionsToInsert = [];

    for (const q of generatedQuestions) {
      let rejectionReason: string | null = null;
      
      const parsedQ = questionValidationSchema.safeParse(q);
      if (!parsedQ.success) {
        rejectionReason = `Missing or invalid fields: ${parsedQ.error.issues.map((e: z.ZodIssue) => e.path.join('.') + ' ' + e.message).join(', ')}`;
      } else {
        const options = [
          String(q.option_a).trim().toLowerCase(),
          String(q.option_b).trim().toLowerCase(),
          String(q.option_c).trim().toLowerCase(),
          String(q.option_d).trim().toLowerCase()
        ];
        if (new Set(options).size !== 4) {
          rejectionReason = "Options contain duplicates";
        }
      }

      if (rejectionReason) {
        rejectedQuestionsToInsert.push({
          job_id: jobId,
          upload_id: job.upload_id,
          raw_data: q,
          rejection_reason: rejectionReason
        });
        continue;
      }

      const normalizedText = String(q.question_text).toLowerCase().trim().replace(/\s+/g, ' ');
      const hash = crypto.createHash('sha256').update(normalizedText).digest('hex');

      const { data: dupQuestions } = await supabaseAdmin
        .from('questions')
        .select('id')
        .eq('question_hash', hash)
        .maybeSingle();
        
      const { data: dupStaged } = await supabaseAdmin
        .from('staged_questions')
        .select('id')
        .eq('question_hash', hash)
        .maybeSingle();

      if (dupQuestions || dupStaged) {
        duplicates++;
        continue;
      }

      let finalStatus = 'pending';
      if (q.subject && q.subject !== 'Auto' && !subjectNames.includes(String(q.subject))) {
        finalStatus = 'needs_review';
      }
      if (q.topic && q.topic !== 'Auto' && !topicNames.includes(String(q.topic))) {
        finalStatus = 'needs_review';
      }

      validQuestionsToInsert.push({
        question_text:  String(q.question_text || '').trim(),
        option_a:       String(q.option_a || '').trim(),
        option_b:       String(q.option_b || '').trim(),
        option_c:       String(q.option_c || '').trim(),
        option_d:       String(q.option_d || '').trim(),
        correct_option: String(q.correct_option || 'a').toLowerCase().trim(),
        explanation:    String(q.explanation || '').trim(),
        difficulty:     String(q.difficulty || 'medium').toLowerCase().trim(),
        subject:        String(q.subject || '').trim(),
        topic:          String(q.topic || '').trim(),
        why_a_wrong:       String(q.why_a_wrong || '').trim(),
        why_b_wrong:       String(q.why_b_wrong || '').trim(),
        why_c_wrong:       String(q.why_c_wrong || '').trim(),
        why_d_wrong:       String(q.why_d_wrong || '').trim(),
        elimination_tip:   String(q.elimination_tip || '').trim(),
        static_topic_link: String(q.static_topic_link || '').trim(),
        tags:              Array.isArray(q.tags) ? q.tags : [],
        created_by:        userId,
        question_hash:     hash,
        status:            finalStatus,
      });
    }

    // 6. Save to DB
    await updateJobStatus(supabaseAdmin, jobId, 'Saving...');
    
    if (rejectedQuestionsToInsert.length > 0) {
      await supabaseAdmin.from('rejected_questions').insert(rejectedQuestionsToInsert);
    }
    
    if (validQuestionsToInsert.length > 0) {
      const { error: insertError } = await supabaseAdmin
        .from('staged_questions')
        .insert(validQuestionsToInsert);

      if (insertError) {
        throw new Error(`Failed to insert into staged_questions: ${insertError.message}`);
      }
    }

    // 7. Mark job as completed
    await supabaseAdmin
      .from('processing_jobs')
      .update({
        status: 'completed',
        status_message: `Saved ${validQuestionsToInsert.length} questions (${duplicates} duplicates skipped, ${rejectedQuestionsToInsert.length} rejected).`,
        questions_generated: validQuestionsToInsert.length,
        error_message: null,
        updated_at: new Date().toISOString()
      })
      .eq('id', jobId);

    // 8. Cleanup storage if all chunks for this upload are done
    const { count, error: countError } = await supabaseAdmin
      .from('processing_jobs')
      .select('*', { count: 'exact', head: true })
      .eq('upload_id', job.upload_id)
      .neq('status', 'completed');

    if (!countError && count === 0) {
      await supabaseAdmin.storage.from('pdf_uploads').remove([job.source_file]);
    }

    return {
      success: true,
      questionsGenerated: validQuestionsToInsert.length,
      duplicatesSkipped: duplicates,
      rejected: rejectedQuestionsToInsert.length
    };

  } catch (processErr: unknown) {
    const errorMessage = processErr instanceof Error ? processErr.message : String(processErr);
    
    await supabaseAdmin
      .from('processing_jobs')
      .update({
        status: 'failed',
        status_message: 'Failed',
        error_message: errorMessage,
        retry_count: (job.retry_count || 0) + 1,
        updated_at: new Date().toISOString()
      })
      .eq('id', jobId);

    throw new Error(errorMessage);
  }
}
