import { ExplainRequestPayload, DetailedExplanation } from "./explain-types";
import { sanitizeJSON } from "./gemini";

export async function generateExplanationCerebras(payload: ExplainRequestPayload): Promise<DetailedExplanation> {
  const apiKey = process.env.CEREBRAS_API_KEY;
  if (!apiKey) throw new Error("CEREBRAS_API_KEY is not configured.");
  const modelName = process.env.CEREBRAS_MODEL || "llama3.1-8b"; // Example Cerebras model

  const url = "https://api.cerebras.ai/v1/chat/completions";

  const prompt = `
You are an expert UPSC mentor. Provide a detailed explanation for this MCQ.
Question: ${payload.question_text}
A) ${payload.option_a}
B) ${payload.option_b}
C) ${payload.option_c}
D) ${payload.option_d}

Correct Answer is: ${payload.correct_option}

Return ONLY a JSON object with this exact structure:
{
  "correct_explanation": "Detailed reason why ${payload.correct_option} is correct",
  "why_others_wrong": {
    "Option 1": "Why this is wrong",
    "Option 2": "Why this is wrong",
    "Option 3": "Why this is wrong"
  },
  "elimination_technique": "How a student could have guessed this using elimination logic",
  "memory_trick": "A short mnemonic or trick to remember this fact"
}
`;

  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${apiKey}`
    },
    body: JSON.stringify({
      model: modelName,
      messages: [
        { role: "system", content: "You are a helpful assistant that always outputs perfectly formatted JSON." },
        { role: "user", content: prompt }
      ],
      temperature: 0.3,
      response_format: { type: "json_object" } // Useful if Cerebras supports it, else prompt engineering handles it
    })
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error("Cerebras API Error:", response.status, errorText);
    throw new Error(`Cerebras Error: ${response.status}`);
  }

  const data = await response.json();
  const rawText = data.choices?.[0]?.message?.content || "";
  const cleanText = sanitizeJSON(rawText);
  return JSON.parse(cleanText) as DetailedExplanation;
}
