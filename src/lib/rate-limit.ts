import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";

// Graceful fallback if UPSTASH_REDIS_REST_URL is missing
let ratelimit: Ratelimit | null = null;

try {
  if (process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN) {
    const redis = new Redis({
      url: process.env.UPSTASH_REDIS_REST_URL,
      token: process.env.UPSTASH_REDIS_REST_TOKEN,
    });
    
    // Default config: 10 requests per 1 minute per identifier
    ratelimit = new Ratelimit({
      redis: redis,
      limiter: Ratelimit.slidingWindow(10, "1 m"),
      analytics: true,
    });
  }
} catch (e) {
  console.warn("Upstash Redis not configured or failed to connect. Rate limiting is bypassed.", e);
}

export async function checkRateLimit(identifier: string): Promise<{ success: boolean; limit: number; remaining: number; reset: number }> {
  if (!ratelimit) {
    // Graceful bypass if not configured
    return { success: true, limit: 100, remaining: 99, reset: Date.now() + 60000 };
  }
  
  return await ratelimit.limit(identifier);
}
