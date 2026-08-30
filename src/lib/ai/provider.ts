import { GenerateRequestPayload, GeneratedQuestion } from "./types";
import { callGemini, generateExplanationGemini } from "./gemini";
import { generateExplanationCerebras } from "./cerebras";
import { ExplainRequestPayload, DetailedExplanation } from "./explain-types";

/**
 * Modular AI Provider
 * Defers to Gemini by default, but can be switched out or extended later.
 */
export async function generateQuestions(payload: GenerateRequestPayload): Promise<GeneratedQuestion[]> {
  // Validate request parameters here if needed
  if (!payload.text || payload.text.trim().length === 0) {
    throw new Error("Source text is required for AI generation.");
  }

  // Call the underlying AI provider
  return await callGemini(payload);
}

/**
 * Fallback Provider for Explanations
 * Tries Gemini first (Priority 1)
 * If Gemini fails (rate limit/exhausted), calls Cerebras (Priority 2)
 */
export async function getDetailedExplanation(payload: ExplainRequestPayload): Promise<DetailedExplanation> {
  try {
    console.log("[AI] Attempting to generate explanation with Gemini (Priority 1)...");
    return await generateExplanationGemini(payload);
  } catch (error: any) {
    const isRateLimit = error?.message === "GEMINI_RATE_LIMIT" || String(error).includes("429");
    console.warn(`[AI] Gemini failed (${error.message}). Falling back to Cerebras (Priority 2)...`);
    
    try {
      return await generateExplanationCerebras(payload);
    } catch (fallbackError: any) {
      console.error("[AI] Both Gemini and Cerebras failed:", fallbackError);
      throw new Error("All AI providers failed to generate an explanation.");
    }
  }
}
