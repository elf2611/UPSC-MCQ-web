import { ExplainRequestPayload, DetailedExplanation } from "./explain-types";
import { sanitizeJSON } from "./gemini";

export async function generateExplanationCerebras(payload: ExplainRequestPayload): Promise<DetailedExplanation> {
  const apiKey = process.env.CEREBRAS_API_KEY;
  if (!apiKey) throw new Error("CEREBRAS_API_KEY is not configured.");
  const modelName = process.env.CEREBRAS_MODEL || "llama3.1-8b"; // Example Cerebras model

  const url = "https://api.cerebras.ai/v1/chat/completions";

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
