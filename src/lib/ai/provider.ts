import { GenerateRequestPayload, GeneratedQuestion } from "./types";
import { callGemini } from "./gemini";

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
