import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin, verifyUserToken } from "@/lib/auth-verify";
import { generateEmbeddingsGemini } from "@/lib/ai/gemini";

// Chunking utility
function chunkText(text: string, maxTokens = 500): string[] {
  // Rough approximation: 1 token ~= 4 characters
  const maxChars = maxTokens * 4;
  const chunks: string[] = [];
  
  // Basic paragraph splitting
  const paragraphs = text.split(/\n\s*\n/);
  let currentChunk = "";
  
  for (const p of paragraphs) {
    if (currentChunk.length + p.length > maxChars) {
      if (currentChunk.trim()) {
        chunks.push(currentChunk.trim());
      }
      currentChunk = p + "\n\n";
    } else {
      currentChunk += p + "\n\n";
    }
  }
  
  if (currentChunk.trim()) {
    chunks.push(currentChunk.trim());
  }
  
  return chunks;
}

export async function POST(req: NextRequest) {
  try {
    const authRes = await verifyUserToken(req);
    if (!authRes.ok) {
      return NextResponse.json({ error: authRes.error }, { status: 401 });
    }

    // Must be admin to ingest data
    // Assuming 'admin' role check, or you can rely on strict user_id checking
    // Here we skip strict admin check to keep it simple, but in production, verify 'role'
    // Let's assume there's a simple hardcoded or DB admin check
    const supabaseAdmin = getSupabaseAdmin();
    const { data: profile } = await supabaseAdmin.from('profiles').select('role').eq('id', authRes.uid).single();
    if (profile?.role !== 'admin') {
      return NextResponse.json({ error: "Forbidden: Admin only" }, { status: 403 });
    }

    const { content, source, subject, topic } = await req.json();
    if (!content || !content.trim()) {
      return NextResponse.json({ error: "Content is required" }, { status: 400 });
    }

    // 1. Chunking
    const chunks = chunkText(content);
    if (chunks.length === 0) {
      return NextResponse.json({ error: "No valid text chunks generated" }, { status: 400 });
    }

    // 2. Process in batches for embeddings (Gemini limits batch size)
    const BATCH_SIZE = 50; 
    let insertedCount = 0;

    for (let i = 0; i < chunks.length; i += BATCH_SIZE) {
      const batchChunks = chunks.slice(i, i + BATCH_SIZE);
      const embeddings = await generateEmbeddingsGemini(batchChunks);

      // Prepare DB rows
      const rows = batchChunks.map((text, idx) => ({
        content: text,
        metadata: { source, subject, topic },
        embedding: embeddings[idx] // PGVector handles arrays automatically when using supabase-js
      }));

      // 3. Insert into Supabase
      const { error } = await supabaseAdmin.from('knowledge_base').insert(rows);
      if (error) {
        console.error("DB Insert Error:", error);
        throw new Error("Database error while inserting embeddings");
      }
      insertedCount += rows.length;
    }

    return NextResponse.json({ success: true, chunksProcessed: insertedCount });
  } catch (error: any) {
    console.error("Ingest API Error:", error);
    return NextResponse.json({ error: error.message || "Internal Server Error" }, { status: 500 });
  }
}
