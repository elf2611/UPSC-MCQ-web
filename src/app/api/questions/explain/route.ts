import { NextResponse } from "next/server";
import { getDetailedExplanation } from "@/lib/ai/provider";
import redis from "@/lib/redis";
import crypto from "crypto";
import { ExplainRequestPayload } from "@/lib/ai/explain-types";

function generateCacheKey(payload: ExplainRequestPayload) {
  // Hash the question text to create a unique ID for caching
  const hash = crypto.createHash("sha256").update(payload.question_text).digest("hex");
  return `explain:${hash}`;
}

export async function POST(req: Request) {
  try {
    const payload = (await req.json()) as ExplainRequestPayload;

    if (!payload.question_text || !payload.correct_option) {
      return NextResponse.json(
        { error: "Missing required fields (question_text, correct_option)" },
        { status: 400 }
      );
    }

    // 1. Check Redis Cache
    const cacheKey = generateCacheKey(payload);
    if (redis) {
      try {
        const cached = await redis.get(cacheKey);
        if (cached) {
          console.log("[API] Returning cached explanation for:", cacheKey);
          return NextResponse.json(cached);
        }
      } catch (redisError) {
        console.warn("[Redis] Cache read failed:", redisError);
      }
    }

    // 2. Generate Explanation (Calls Gemini first, Cerebras fallback)
    console.log("[API] Generating new explanation...");
    const explanation = await getDetailedExplanation(payload);

    // 3. Save to Redis Cache (7 Days TTL)
    if (redis) {
      try {
        await redis.setex(cacheKey, 7 * 24 * 60 * 60, explanation);
        console.log("[Redis] Cached explanation for 7 days:", cacheKey);
      } catch (redisError) {
        console.warn("[Redis] Cache write failed:", redisError);
      }
    }

    // 4. Return to frontend
    return NextResponse.json(explanation);
  } catch (error: any) {
    console.error("[API] Explanation generation failed:", error);
    return NextResponse.json(
      { error: "Failed to generate explanation. Please try again." },
      { status: 500 }
    );
  }
}
