import { getStudentStats } from "./memory";
import { getSupabaseAdmin } from "@/lib/auth-verify";
import { generateEmbeddingsGemini } from "./gemini";

// --- Function Declarations for Gemini ---
export const aiMentorTools = [
  {
    name: "get_weak_topics",
    description: "Fetches the student's weakest subjects and topics based on their recent test accuracy.",
    parameters: {
      type: "object",
      properties: {},
      required: []
    }
  },
  {
    name: "search_upsc_knowledge",
    description: "Searches the trusted UPSC knowledge base (NCERTs, Polity, current affairs) to accurately answer factual doubts. ALWAYS use this for factual UPSC questions.",
    parameters: {
      type: "object",
      properties: {
        query: {
          type: "string",
          description: "The factual question or concept to search for in the database."
        }
      },
      required: ["query"]
    }
  }
];

// --- Function Implementations ---

/**
 * Derives data entirely from the SERVER-SIDE userId.
 * The model does NOT provide the userId, preventing malicious access.
 */
export async function executeTool(name: string, args: any, userId: string): Promise<any> {
  console.log(`[AI Tool] Executing ${name} for user ${userId}`);
  
  switch (name) {
    case "get_weak_topics":
      return await executeGetWeakTopics(userId);
    case "search_upsc_knowledge":
      return await executeSearchUPSC(args.query);
    default:
      throw new Error(`Unknown tool: ${name}`);
  }
}

async function executeGetWeakTopics(userId: string) {
  try {
    const stats = await getStudentStats(userId);
    if (!stats || stats.length === 0) {
      return { message: "No sufficient test data found yet to determine weak topics." };
    }
    
    // Sort by lowest accuracy first
    const weak = stats
      .filter(s => s.total_attempted > 5) // At least 5 attempts to be statistically relevant
      .sort((a, b) => a.accuracy_percent - b.accuracy_percent)
      .slice(0, 3);
      
    if (weak.length === 0) {
       return { message: "Student is performing well or needs more practice to find clear weak spots.", all_stats: stats.slice(0, 3) };
    }
    
    return { 
      weak_topics: weak.map(w => ({
        subject_id: w.subject_id,
        topic_id: w.topic_id,
        accuracy: w.accuracy_percent,
        attempts: w.total_attempted
      }))
    };
  } catch (error: any) {
    console.error("Tool execution error:", error);
    return { error: "Failed to fetch weak topics." };
  }
}

async function executeSearchUPSC(query: string) {
  try {
    // Advanced RAG: Hybrid Search (Vector + Keyword)
    // 1. Get embedding for the query
    const embeddings = await generateEmbeddingsGemini([query]);
    const queryEmbedding = embeddings[0];
    
    // 2. Call the match_knowledge RPC we created in migration 033
    const supabase = getSupabaseAdmin();
    const { data, error } = await supabase.rpc('match_knowledge', {
      query_embedding: `[${queryEmbedding.join(',')}]`, // pgvector format
      query_text: query,
      match_count: 3,
      full_text_weight: 1.0,
      semantic_weight: 1.0
    });

    if (error) {
      console.error("[RAG] match_knowledge RPC error:", error);
      return { error: "Failed to search knowledge base." };
    }

    if (!data || data.length === 0) {
      return { message: "No relevant UPSC sources found for this query." };
    }

    return {
      results: data.map((d: any) => ({
        content: d.content,
        source: d.metadata?.source || "UPSC Knowledge Base",
        similarity_score: d.similarity
      }))
    };
  } catch (error: any) {
    console.error("Tool execution error (search_upsc_knowledge):", error);
    return { error: "Failed to perform knowledge search." };
  }
}
