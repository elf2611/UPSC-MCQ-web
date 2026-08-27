import { NextRequest, NextResponse } from "next/server";
import { verifyUserToken, getUserTier, getSupabaseAdmin } from "@/lib/auth-verify";
import { scoreAgainstRubric, RubricDimension } from "@/lib/ai/rubric";

export const maxDuration = 60; // Allow Vercel Function to run for 60s for long AI grading

export async function POST(req: NextRequest) {
  try {
    const authRes = await verifyUserToken(req);
    if (!authRes.ok) {
      return NextResponse.json({ error: authRes.error }, { status: 401 });
    }

    // Checking tier. Standard tier users might be gated or limited.
    // Let's assume standard users can submit 1 per day, Premium/Elite unlimited.
    const tier = await getUserTier(authRes.uid);
    const supabaseAdmin = getSupabaseAdmin();

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    if (tier === 'free' || tier === 'standard') {
      const { count } = await supabaseAdmin
        .from('mains_answers')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', authRes.uid)
        .gte('submitted_at', today.toISOString());
      
      if (count && count >= 1) {
        return NextResponse.json({ error: "Daily free limit reached for Mains Grading. Upgrade to Premium for unlimited grading." }, { status: 429 });
      }
    }

    const { questionId, answerText, wordCount } = await req.json();

    if (!questionId || !answerText || wordCount < 20) {
      return NextResponse.json({ error: "Invalid submission. Minimum 20 words required." }, { status: 400 });
    }

    // 1. Fetch Question
    const { data: question } = await supabaseAdmin
      .from('mains_questions')
      .select('*')
      .eq('id', questionId)
      .single();

    if (!question) {
      return NextResponse.json({ error: "Question not found" }, { status: 404 });
    }

    // 2. Define standard UPSC rubric
    // Let's scale dimensions to match the question's total marks (e.g. 10 or 15 marks).
    const maxMarks = question.marks || 15;
    const contentMax = Math.round(maxMarks * 0.4); // 40% for core content
    const structMax = Math.round(maxMarks * 0.2);
    const introConMax = Math.round(maxMarks * 0.2);
    const examplesMax = Math.round(maxMarks * 0.1);
    const wordDisciplineMax = maxMarks - contentMax - structMax - introConMax - examplesMax; // remaining 10%

    const rubric: RubricDimension[] = [
      { name: "Content", maxScore: contentMax, description: "Factual accuracy, addressing all parts of the question, depth of knowledge." },
      { name: "Structure", maxScore: structMax, description: "Logical flow, paragraphing, headings if applicable, coherence." },
      { name: "Intro_Conclusion", maxScore: introConMax, description: "Impactful introduction setting context, and a forward-looking balanced conclusion." },
      { name: "Examples", maxScore: examplesMax, description: "Use of relevant data, committee reports, Supreme Court judgments, or current affairs examples." },
      { name: "Word_Discipline", maxScore: wordDisciplineMax, description: `Adherence to the ${question.word_limit} word limit. Conciseness without losing meaning.` },
    ];

    const contextStr = `
Paper: ${question.paper}
Topic: ${question.topic}
Marks: ${maxMarks}
Word Limit: ${question.word_limit}

Question:
${question.question_text}

Model Answer Notes/Hints:
${question.model_answer_notes || "None provided. Evaluate purely on merit."}
`;

    // 3. Call AI Grading Engine
    const scoringResult = await scoreAgainstRubric(answerText, contextStr, rubric);

    // 4. Save to Database
    const { data: answerRow, error: saveError } = await supabaseAdmin
      .from('mains_answers')
      .insert({
        user_id: authRes.uid,
        question_id: questionId,
        answer_text: answerText,
        word_count: wordCount,
        score_content: scoringResult.scores["Content"] || 0,
        score_structure: scoringResult.scores["Structure"] || 0,
        score_intro_conclusion: scoringResult.scores["Intro_Conclusion"] || 0,
        score_examples: scoringResult.scores["Examples"] || 0,
        score_word_discipline: scoringResult.scores["Word_Discipline"] || 0,
        score_total: scoringResult.totalScore,
        feedback_text: {
          dimensions: scoringResult.feedback,
          overall: scoringResult.overallFeedback
        }
      })
      .select()
      .single();

    if (saveError) {
      console.error("Failed to save mains answer:", saveError);
      throw new Error("Failed to save evaluated answer.");
    }

    return NextResponse.json({ success: true, result: answerRow });

  } catch (error: any) {
    console.error("Mains Submit API Error:", error);
    return NextResponse.json({ error: (error as Error).message || "Internal Server Error" }, { status: 500 });
  }
}
