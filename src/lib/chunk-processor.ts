// src/lib/chunk-processor.ts
//
// Shared logic used by /api/process-next. Given a job's page range, this:
// downloads the PDF, extracts text for that page range, calls Gemini
// (with retry + timeout), sanitizes + validates the JSON, dedupes against
// existing questions, batch-inserts into staged_questions, and marks the
// job completed. Throws on unrecoverable failure — the caller (process-next)
// is responsible for marking the job 'failed' if this throws.
//
// NOTE: pdf-lib is intentionally NOT used here. It causes DOMMatrix /
// @napi-rs/canvas errors on Vercel's serverless Node.js runtime.
// Text extraction uses pdf-parse directly with a pagerender filter.

import crypto from 'crypto';
import { z } from 'zod';
import type { SupabaseClient } from '@supabase/supabase-js';

// Polyfill Canvas API objects required by pdfjs-dist (used by pdf-parse) in Node.js
if (typeof global !== 'undefined') {
  const g = global as Record<string, unknown>;
  if (typeof g.DOMMatrix === 'undefined') {
    g.DOMMatrix = class DOMMatrix {};
  }
  if (typeof g.Path2D === 'undefined') {
    g.Path2D = class Path2D {};
  }
  if (typeof g.ImageData === 'undefined') {
    g.ImageData = class ImageData {};
  }
}

// eslint-disable-next-line @typescript-eslint/no-require-imports
const pdfParse = require('pdf-parse');

const GEMINI_TIMEOUT_MS = 25_000;
const GEMINI_MAX_RETRIES = 3;

const QuestionSchema = z.object({
  question_text: z.string().min(1),
  option_a: z.string().min(1),
  option_b: z.string().min(1),
  option_c: z.string().min(1),
  option_d: z.string().min(1),
  correct_option: z.enum(['a', 'b', 'c', 'd']),
  explanation: z.string().default(''),
  why_a_wrong: z.string().default(''),
  why_b_wrong: z.string().default(''),
  why_c_wrong: z.string().default(''),
  why_d_wrong: z.string().default(''),
  elimination_tip: z.string().default(''),
  subject: z.string().default(''),
  topic: z.string().default(''),
  subtopic: z.string().default(''),
  difficulty: z.string().default(''),
  year: z.number().nullable().optional(),
});

type ChunkProcessorArgs = {
  jobId: string;
  uploadId: string;
  sourceFile: string;
  startPage: number;
  endPage: number;
  supabaseAdmin: SupabaseClient;
  onStatus: (msg: string) => void;
};

// Types for pdf-parse's pagerender callback
interface PdfTextItem {
  str: string;
}
interface PdfTextContent {
  items: PdfTextItem[];
}
interface PdfPageData {
  pageIndex: number; // 0-based
  getTextContent: () => Promise<PdfTextContent>;
}

function normalizeHash(text: string): string {
  const normalized = text.toLowerCase().trim().replace(/\s+/g, ' ');
  return crypto.createHash('sha256').update(normalized).digest('hex');
}

function sanitizeJsonResponse(raw: string): string {
  let text = raw.trim();
  // Strip markdown code fences
  text = text.replace(/^```(?:json)?\s*/i, '').replace(/```\s*$/i, '');
  // Trim to the outermost array/object
  const firstBracket = Math.min(
    ...(['[', '{'] as const).map((c) => {
      const i = text.indexOf(c);
      return i === -1 ? Infinity : i;
    })
  );
  const lastBracket = Math.max(text.lastIndexOf(']'), text.lastIndexOf('}'));
  if (firstBracket !== Infinity && lastBracket !== -1 && lastBracket >= firstBracket) {
    text = text.slice(firstBracket, lastBracket + 1);
  }
  // Normalize smart quotes
  text = text.replace(/[\u2018\u2019]/g, "'").replace(/[\u201C\u201D]/g, '"');
  return text;
}

// Extract text for only the specified page range from a PDF buffer.
// Uses pdf-parse's pagerender callback (same library as /api/extract/route.ts)
// with a max page limit to avoid scanning the entire PDF unnecessarily.
async function extractTextFromPageRange(
  buffer: Buffer,
  startPage: number,
  endPage: number
): Promise<string> {
  const pageTexts: string[] = [];

  await pdfParse(buffer, {
    // Stop parsing after endPage — no need to scan further pages
    max: endPage,
    pagerender: (pageData: PdfPageData): Promise<string> => {
      const pageNum = pageData.pageIndex + 1; // convert 0-based to 1-based
      if (pageNum < startPage) {
        // Before our range — return empty string, don't collect
        return Promise.resolve('');
      }
      return pageData.getTextContent().then((content: PdfTextContent) => {
        const text = content.items.map((item: PdfTextItem) => item.str).join(' ');
        if (text.trim().length > 0) {
          pageTexts.push(text);
        }
        return text;
      });
    },
  });

  return pageTexts.join('\n\n');
}

async function callGeminiWithRetry(prompt: string, onStatus: (msg: string) => void): Promise<string> {
  let lastError: unknown;

  for (let attempt = 1; attempt <= GEMINI_MAX_RETRIES; attempt++) {
    onStatus(`Calling Gemini (attempt ${attempt}/${GEMINI_MAX_RETRIES})...`);
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), GEMINI_TIMEOUT_MS);

      const modelName = process.env.GEMINI_MODEL;
      if (!modelName) throw new Error("GEMINI_MODEL is not configured on the server.");
      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${process.env.GEMINI_API_KEY}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{ parts: [{ text: prompt }] }],
          }),
          signal: controller.signal,
        }
      );

      clearTimeout(timeout);

      if (response.status === 429) {
        const waitMs = 2000 * attempt;
        onStatus(`Rate limited, waiting ${waitMs}ms before retry...`);
        await new Promise((r) => setTimeout(r, waitMs));
        lastError = new Error('Gemini rate limited (429)');
        continue;
      }

      if (!response.ok) {
        lastError = new Error(`Gemini returned ${response.status}: ${await response.text()}`);
        continue;
      }

      const data = await response.json();
      const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;
      if (!text) {
        lastError = new Error('Gemini response had no text content');
        continue;
      }
      return text;

    } catch (err: unknown) {
      lastError = err;
      if (err instanceof Error && err.name === 'AbortError') {
        onStatus(`Gemini call timed out after ${GEMINI_TIMEOUT_MS}ms (attempt ${attempt})`);
      }
      // brief backoff before next attempt
      await new Promise((r) => setTimeout(r, 1000 * attempt));
    }
  }

  throw new Error(
    `Gemini failed after ${GEMINI_MAX_RETRIES} attempts: ${lastError instanceof Error ? lastError.message : String(lastError)}`
  );
}

export async function processChunk(args: ChunkProcessorArgs): Promise<{ questionsGenerated: number }> {
  const { jobId, sourceFile, startPage, endPage, supabaseAdmin, onStatus } = args;

  const updateStatus = async (message: string) => {
    onStatus(message);
    await supabaseAdmin
      .from('processing_jobs')
      .update({ status_message: message, updated_at: new Date().toISOString() })
      .eq('id', jobId);
  };

  // 1. Download PDF
  await updateStatus(`Downloading PDF...`);
  const { data: fileData, error: downloadError } = await supabaseAdmin
    .storage
    .from('pdf_uploads')
    .download(sourceFile);

  if (downloadError || !fileData) {
    throw new Error(`Failed to download PDF: ${downloadError?.message ?? 'unknown storage error'}`);
  }

  const arrayBuffer = await fileData.arrayBuffer();

  // 2. Extract text for only this chunk's page range.
  // Uses pdf-parse directly — no pdf-lib, which fails on Vercel (DOMMatrix).
  await updateStatus(`Extracting pages ${startPage}-${endPage}...`);
  const buffer = Buffer.from(arrayBuffer);
  const extractedText = await extractTextFromPageRange(buffer, startPage, endPage);

  if (!extractedText || extractedText.trim().length === 0) {
    throw new Error(`No extractable text found in pages ${startPage}-${endPage} (possibly a scanned/image PDF)`);
  }

  // 3. Call Gemini
  await updateStatus('Sending to Gemini...');
  const prompt = `You are extracting UPSC exam MCQs from the following text. Return ONLY a JSON array, no markdown, no explanation. Each object must have exactly these fields: question_text, option_a, option_b, option_c, option_d, correct_option (one of "a","b","c","d"), explanation, why_a_wrong, why_b_wrong, why_c_wrong, why_d_wrong, elimination_tip, subject, topic, subtopic, difficulty, year. If a field can't be determined, use an empty string. For the year field only, use null if it cannot be determined — never an empty string. year: the actual UPSC exam year this question was asked in, if the source text labels it (e.g. '[2019]', 'UPSC CSE 2020', a year in parentheses near the question). Use null if the source doesn't indicate a specific exam year (i.e., not a genuine PYQ).

Text to extract from:
${extractedText}`;

  const rawResponse = await callGeminiWithRetry(prompt, updateStatus);

  // 4. Sanitize + parse
  await updateStatus('Validating questions...');
  const sanitized = sanitizeJsonResponse(rawResponse);
  let parsed: unknown;
  try {
    parsed = JSON.parse(sanitized);
  } catch (parseErr) {
    throw new Error(`Gemini response could not be parsed as JSON even after sanitizing: ${parseErr instanceof Error ? parseErr.message : String(parseErr)}`);
  }

  const rawArray = Array.isArray(parsed) ? parsed : [parsed];
  const validQuestions: z.infer<typeof QuestionSchema>[] = [];
  const rejected: { reason: string; data: unknown }[] = [];

  for (const item of rawArray) {
    const result = QuestionSchema.safeParse(item);
    if (result.success) {
      validQuestions.push(result.data);
    } else {
      rejected.push({ reason: result.error.message, data: item });
    }
  }

  if (rejected.length > 0) {
    console.warn(JSON.stringify({ event_type: 'questions_rejected', jobId, count: rejected.length, samples: rejected.slice(0, 3) }));
  }

  // 5. Dedup + insert
  await updateStatus('Checking duplicates and saving...');
  const rowsToInsert = [];
  for (const q of validQuestions) {
    const hash = normalizeHash(q.question_text);

    const { data: existing } = await supabaseAdmin
      .from('staged_questions')
      .select('id')
      .eq('question_hash', hash)
      .limit(1);

    const { data: existingLive } = await supabaseAdmin
      .from('questions')
      .select('id')
      .eq('question_hash', hash)
      .limit(1);

    if ((existing && existing.length > 0) || (existingLive && existingLive.length > 0)) {
      continue; // duplicate, skip
    }

    rowsToInsert.push({
      ...q,
      question_hash: hash,
      status: 'pending',
      source_file: sourceFile,
    });
  }

  if (rowsToInsert.length > 0) {
    const { error: insertError } = await supabaseAdmin
      .from('staged_questions')
      .insert(rowsToInsert);

    if (insertError) {
      throw new Error(`Failed to insert staged_questions: ${insertError.message}`);
    }
  }

  // 6. Mark job completed
  await supabaseAdmin
    .from('processing_jobs')
    .update({
      status: 'completed',
      status_message: 'Completed',
      questions_generated: rowsToInsert.length,
      updated_at: new Date().toISOString(),
    })
    .eq('id', jobId);

  return { questionsGenerated: rowsToInsert.length };
}
