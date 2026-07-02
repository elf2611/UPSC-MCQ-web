import { GenerateRequestConfig } from "./types";

export function buildPrompt(text: string, config: GenerateRequestConfig): string {
  const {
    count,
    difficulty,
    upscLevel,
    subject,
    topic,
    language,
    explanationLength,
    includeEliminationTips,
    autoGenerateTags,
  } = config;

  return `You are an expert UPSC content creator. Your task is to generate exactly ${count} multiple-choice questions (MCQs) for the UPSC Civil Services Examination based on the provided text.

Configuration:
- Difficulty: ${difficulty}
- UPSC Level: ${upscLevel}
- Subject: ${subject}
- Topic: ${topic}
- Language: ${language}
- Explanation Length: ${explanationLength}

Requirements for each question:
1. Question text should be clear and conceptually rigorous, mimicking the UPSC standard.
2. Provide exactly 4 options (Option A, B, C, D).
3. Specify the correct option (A, B, C, or D).
4. Provide a ${explanationLength.toLowerCase()} explanation for why the correct answer is right.
5. Provide specific reasons why each of the incorrect options is wrong (why_a_wrong, why_b_wrong, etc.). The correct option's "why wrong" field can be empty or null.
6. Estimated solving time (in seconds) between 45 and 120.
7. Revision priority: choose from "low", "normal", or "high".
${includeEliminationTips ? '8. Include a specific UPSC "Elimination Tip" to help logically eliminate wrong options.\n9. Include a "Memory Trick" to help remember the concept.' : '8. Do NOT include elimination tips or memory tricks.'}
${autoGenerateTags ? '10. Generate an array of 3-5 relevant tags (strings).' : ''}

CRITICAL INSTRUCTION:
Return ONLY a valid JSON array of objects. Do not include markdown formatting, backticks (\`\`\`), or any conversational text outside the JSON array.

JSON Schema per object:
{
  "question_text": "string",
  "option_a": "string",
  "option_b": "string",
  "option_c": "string",
  "option_d": "string",
  "correct_option": "A" | "B" | "C" | "D",
  "explanation": "string",
  "why_a_wrong": "string",
  "why_b_wrong": "string",
  "why_c_wrong": "string",
  "why_d_wrong": "string",
  "elimination_tip": "string",
  "memory_trick": "string",
  "static_topic_link": "string",
  "related_current_affairs": "string",
  "difficulty": "Easy" | "Medium" | "Hard",
  "estimated_solving_time": number,
  "subject": "string",
  "topic": "string",
  "tags": ["string"],
  "source": "string",
  "revision_priority": "low" | "normal" | "high"
}

Source text to base the questions on:
"""
${text}
"""
`;
}
