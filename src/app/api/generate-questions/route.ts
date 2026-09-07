import { NextRequest, NextResponse } from "next/server";
import { generateQuestions } from "@/lib/ai/provider";
import { evaluateQuestionGemini } from "@/lib/ai/gemini";

export const dynamic = 'force-dynamic';

// Basic in-memory rate limiting map for demonstration (resets on server restart)
const rateLimitMap = new Map<string, { count: number, resetTime: number }>();
const LIMIT = 10; // 10 requests per 10 minutes
const WINDOW_MS = 10 * 60 * 1000;

export async function POST(req: NextRequest) {
  try {
    // 1. Rate Limiting based on IP
    const ip = req.headers.get("x-forwarded-for") || "127.0.0.1";
    const now = Date.now();
    const rateData = rateLimitMap.get(ip);
    
    if (rateData) {
      if (now > rateData.resetTime) {
        rateLimitMap.set(ip, { count: 1, resetTime: now + WINDOW_MS });
      } else if (rateData.count >= LIMIT) {
        return NextResponse.json({ error: "Rate limit exceeded. Try again later." }, { status: 429 });
      } else {
        rateData.count += 1;
      }
    } else {
      rateLimitMap.set(ip, { count: 1, resetTime: now + WINDOW_MS });
    }

    // 2. Process Request
    const body = await req.json();
    if (!body || !body.text || !body.config) {
      return NextResponse.json({ error: "Missing text or configuration" }, { status: 400 });
    }

    const questions = await generateQuestions({ text: body.text, config: body.config });
    
    const validQuestions = [];
    const rejectedQuestions = [];
    for (const q of questions) {
      if (!q.question_text || !q.option_a || !q.option_b || !q.option_c || !q.option_d || !q.correct_option) {
        continue; // structural failure
      }

      // Step 2: AI Evaluation / Gatekeeper
      try {
        const evalResult = await evaluateQuestionGemini(q);
        // Only accept if strictly passed and relevance/distractor quality is very high
        if (
          evalResult.passed &&
          evalResult.upsc_relevance >= 0.90 &&
          evalResult.factual_correctness >= 0.90 &&
          evalResult.ambiguity <= 0.20 &&
          evalResult.distractor_quality >= 0.80 &&
          evalResult.single_correct_answer
        ) {
          validQuestions.push({
            ...q,
            source: 'ai_generated', // Strictly brand as AI
            difficulty: 'medium', // Can map evalResult.difficulty to simple text if needed
            eval_score: evalResult // Just for admin review, can be stripped before DB insert
          });
        } else {
          rejectedQuestions.push({ ...q, rejection_reason: evalResult.reason || 'Failed strict thresholds.' });
          console.log(`[AI Eval Rejected]: ${evalResult.reason || 'Failed strict thresholds.'}`);
        }
      } catch (evalErr) {
        console.error("Eval failed, rejecting question:", evalErr);
      }
    }
    
    return NextResponse.json({ 
      data: validQuestions, 
      rejected: rejectedQuestions 
    });
  } catch (error: unknown) {
    console.error("Generate API error:", error);
    return NextResponse.json({ error: (error as Error).message || "Failed to generate questions" }, { status: 500 });
  }
}
