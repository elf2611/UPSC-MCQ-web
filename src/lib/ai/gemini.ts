import { GenerateRequestPayload, GeneratedQuestion } from "./types";
import { buildPrompt } from "./prompts";

export async function callGemini(payload: GenerateRequestPayload): Promise<GeneratedQuestion[]> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error("GEMINI_API_KEY is not configured on the server.");
  }

  const prompt = buildPrompt(payload.text, payload.config);
  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`;

  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: {
        temperature: 0.2,
        responseMimeType: "application/json"
      }
    })
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error("Gemini API Error:", errorText);
    throw new Error(`Failed to generate questions via Gemini: ${response.status}`);
  }

  const data = await response.json();
  const rawText = data.candidates?.[0]?.content?.parts?.[0]?.text;

  if (!rawText) {
    throw new Error("Gemini returned an empty response.");
  }

  try {
    // Attempt to parse the JSON
    // Sometimes the model might wrap in markdown even with responseMimeType set
    let cleanText = rawText.trim();
    if (cleanText.startsWith('```json')) {
      cleanText = cleanText.substring(7, cleanText.length - 3).trim();
    } else if (cleanText.startsWith('```')) {
      cleanText = cleanText.substring(3, cleanText.length - 3).trim();
    }

    const parsed: GeneratedQuestion[] = JSON.parse(cleanText);
    if (!Array.isArray(parsed)) {
      throw new Error("Gemini response is not a JSON array.");
    }

    // Force default static overrides based on config
    return parsed.map(q => ({
      ...q,
      subject: payload.config.subject !== "Auto" ? payload.config.subject : q.subject,
      topic: payload.config.topic !== "Auto" ? payload.config.topic : q.topic,
      source: payload.config.source,
    }));
  } catch (err: any) {
    console.error("Error parsing Gemini JSON:", err, rawText);
    throw new Error("Failed to parse Gemini output into valid JSON.");
  }
}
