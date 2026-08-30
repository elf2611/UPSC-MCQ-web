import { ExplainRequestPayload, DetailedExplanation } from "./explain-types";

import { GenerateRequestPayload, GeneratedQuestion } from "./types";
import { buildPrompt } from "./prompts";

export function sanitizeJSON(rawText: string): string {
  let cleanText = rawText.trim();
  
  // 1. Strip markdown code fences
  if (cleanText.startsWith('```json')) {
    cleanText = cleanText.substring(7);
  } else if (cleanText.startsWith('```')) {
    cleanText = cleanText.substring(3);
  }
  if (cleanText.endsWith('```')) {
    cleanText = cleanText.substring(0, cleanText.length - 3);
  }
  cleanText = cleanText.trim();

  // 2. Find first [ and last ] to discard conversational prose
  const firstBracket = cleanText.indexOf('[');
  const lastBracket = cleanText.lastIndexOf(']');
  if (firstBracket !== -1 && lastBracket !== -1 && lastBracket > firstBracket) {
    cleanText = cleanText.substring(firstBracket, lastBracket + 1);
  } else {
    // If no array brackets, check if it's a single object
    const firstBrace = cleanText.indexOf('{');
    const lastBrace = cleanText.lastIndexOf('}');
    if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
      cleanText = cleanText.substring(firstBrace, lastBrace + 1);
      cleanText = `[${cleanText}]`; // Wrap in array
    }
  }

  // 3. Normalize smart quotes to straight quotes
  cleanText = cleanText.replace(/[\u2018\u2019]/g, "'").replace(/[\u201C\u201D]/g, '"');

  // 4. Remove trailing commas before ] or }
  cleanText = cleanText.replace(/,\s*([\]}])/g, '$1');

  return cleanText;
}

const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

export async function callGemini(payload: GenerateRequestPayload): Promise<GeneratedQuestion[]> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error("GEMINI_API_KEY is not configured on the server.");

  const prompt = buildPrompt(payload.text, payload.config);
  const modelName = process.env.GEMINI_MODEL;
  if (!modelName) throw new Error("GEMINI_MODEL is not configured on the server.");
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${apiKey}`;

  let retries = 0;
  const maxRetries = 3;
  let lastError: Error | null = null;
  let rawText = "";

  while (retries <= maxRetries) {
    try {
      if (retries > 0) {
        const delay = Math.pow(2, retries) * 1000;
        console.log(`[Gemini] Retrying in ${delay}ms... (Attempt ${retries}/${maxRetries})`);
        await sleep(delay);
      }

      const response = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: { temperature: 0.2, responseMimeType: "application/json" }
        })
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error("Gemini API Error:", response.status, errorText);
        if (response.status === 429 || response.status >= 500) {
          throw new Error(`Gemini rate limited or server error: ${response.status}`);
        }
        throw new Error(`Failed to generate questions via Gemini: ${response.status} - ${errorText}`);
      }

      const data = await response.json();
      rawText = data.candidates?.[0]?.content?.parts?.[0]?.text;
      if (!rawText) throw new Error("Gemini returned an empty response.");

      const cleanText = sanitizeJSON(rawText);
      const parsed: GeneratedQuestion[] = JSON.parse(cleanText);

      if (!Array.isArray(parsed)) throw new Error("Gemini response is not a JSON array.");

      return parsed.map(q => ({
        ...q,
        subject: payload.config.subject !== "Auto" ? payload.config.subject : q.subject,
        topic: payload.config.topic !== "Auto" ? payload.config.topic : q.topic,
        source: payload.config.source,
      }));

    } catch (error: unknown) {
      lastError = error instanceof Error ? error : new Error(String(error));
      const message = lastError.message.toLowerCase();
      // Retry on network errors, rate limits, or JSON parse errors
      if (
        message.includes("rate limited") || 
        message.includes("server error") || 
        message.includes("json") || 
        message.includes("fetch") || 
        message.includes("timeout") ||
        message.includes("empty response")
      ) {
        retries++;
      } else {
        throw lastError; // Unrecoverable
      }
    }
  }

  // If we exhaust retries and the last error was JSON parsing, attach raw text so caller can log it
  if (lastError?.message.includes("JSON") || lastError?.message.includes("Unexpected token")) {
    const errorWithRaw = new Error(`JSON Parsing Failed: ${lastError?.message}`);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (errorWithRaw as any).rawResponse = rawText; 
    throw errorWithRaw;
  }

  throw lastError;
}


export async function generateExplanationGemini(payload: ExplainRequestPayload): Promise<DetailedExplanation> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error("GEMINI_API_KEY is not configured.");
  const modelName = process.env.GEMINI_MODEL || "gemini-1.5-flash";
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${apiKey}`;

  const prompt = `
You are an elite UPSC faculty member and mentor. Your goal is to explain the following Multiple Choice Question to a UPSC aspirant in a way that is highly detailed, extremely useful, professional, yet written in accessible, easy-to-understand language.

Question: ${payload.question_text}
A) ${payload.option_a}
B) ${payload.option_b}
C) ${payload.option_c}
D) ${payload.option_d}

The officially Correct Answer is: ${payload.correct_option}

Return ONLY a JSON object with this exact structure:
{
  "correct_explanation": "Explain exactly WHY this is the correct answer. Provide deep conceptual clarity, historical/factual context, and connect it to the UPSC syllabus. Use medium-simple vocabulary. Keep the tone encouraging and professional.",
  "why_others_wrong": {
    "Option X": "Explicitly state why this option is factually or conceptually wrong. Explain the trap the examiner set."
  },
  "elimination_technique": "Give the student a logical deduction, common-sense approach, or elimination strategy they could have used in the exam hall.",
  "memory_trick": "Provide a highly effective mnemonic, visualization, or simple trick to remember this fact for the actual exam."
}
`;

  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: { temperature: 0.3, responseMimeType: "application/json" }
    })
  });

  if (!response.ok) {
    if (response.status === 429) throw new Error("GEMINI_RATE_LIMIT");
    throw new Error(`Gemini Error: ${response.status}`);
  }

  const data = await response.json();
  const rawText = data.candidates?.[0]?.content?.parts?.[0]?.text || "";
  const cleanText = sanitizeJSON(rawText);
  const parsed = JSON.parse(cleanText);
  return (Array.isArray(parsed) ? parsed[0] : parsed) as DetailedExplanation;
}
