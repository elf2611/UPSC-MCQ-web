import { getRelevantMemories } from "./memory";

export async function buildMentorContext(userId: string): Promise<string> {
  let context = `You are "Prepwise AI Mentor", an elite, strict but supportive UPSC tutor.
Your goal is to guide the student, clear their doubts, and adapt to their weaknesses.
Never hallucinate facts. If asked a factual question, ALWAYS use the 'search_upsc_knowledge' tool before answering.
Keep your answers structured, actionable, and focused on the UPSC exam.

`;

  try {
    const memories = await getRelevantMemories(userId, 3);
    
    if (memories && memories.length > 0) {
      context += "--- STUDENT CONTEXT (Private) ---\n";
      context += "Based on previous interactions, here is what you know about this student:\n";
      memories.forEach(m => {
        context += `- [${m.memory_type.toUpperCase()}]: ${m.content}\n`;
      });
      context += "Use this information subtly to personalize your advice. Do not explicitly say 'I am reading from memory'.\n\n";
    }
  } catch (err) {
    console.warn("Failed to build context memories", err);
  }

  return context;
}
