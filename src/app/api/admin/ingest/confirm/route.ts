import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin, verifyAdminToken } from "@/lib/auth-verify";
import { generateEmbeddingsGemini } from "@/lib/ai/gemini";

export async function POST(req: NextRequest) {
  try {
    // 1. Strict Server-Side Auth - REVALIDATE
    const authRes = await verifyAdminToken(req);
    if (!authRes.ok) {
      return NextResponse.json({ error: authRes.error }, { status: authRes.status });
    }

    const { mcqs, concepts, document_hash, sourceName, subject, topic } = await req.json();
    
    // 2. Untrusted Payload Revalidation
    if (!document_hash || !sourceName) {
      return NextResponse.json({ error: "Missing required metadata" }, { status: 400 });
    }
    
    if (!Array.isArray(mcqs)) {
      return NextResponse.json({ error: "Invalid MCQs payload" }, { status: 400 });
    }

    const supabase = getSupabaseAdmin();
    let ragInserted = 0;
    let practiceInserted = 0;
    let duplicatesSkipped = 0;
    let rejected = 0;

    // We process in small chunks to avoid timeout, but for Vercel functions, 
    // we assume the admin approved a reasonable chunk (e.g. 50 items).
    // In a fully robust system, this would be a background job.
    
    const validMcqs = mcqs.filter(m => m.confidence >= 50);
    rejected += mcqs.length - validMcqs.length;

    // Batch process for Gemini embeddings
    const BATCH_SIZE = 25;
    
    for (let i = 0; i < validMcqs.length; i += BATCH_SIZE) {
      const batch = validMcqs.slice(i, i + BATCH_SIZE);
      const textsToEmbed = batch.map(m => 
        `[MCQ #${m.question_number} (${m.source_type})] Question: ${m.question_text} Options: A) ${m.option_a} B) ${m.option_b} C) ${m.option_c} D) ${m.option_d} Correct Answer: ${m.correct_option} Explanation: ${m.explanation}`
      );
      
      const embeddings = await generateEmbeddingsGemini(textsToEmbed);
      
      // Dual Insertion
      for (let j = 0; j < batch.length; j++) {
        const item = batch[j];
        
        // Check for exact duplicate in practice_questions
        const { data: existingQ } = await supabase
          .from('questions')
          .select('id')
          .ilike('question_text', item.question_text.substring(0, 100) + '%') // simplistic check
          .limit(1);
          
        const isDuplicate = existingQ && existingQ.length > 0;
        
        if (isDuplicate) {
          duplicatesSkipped++;
          continue;
        }
        
        // Insert into Practice Bank
        const { error: practiceError } = await supabase.from('questions').insert({
          subject: subject || "Uncategorized",
          topic: topic || "Uncategorized",
          difficulty: "Medium", // heuristic default
          year: item.year,
          question_text: item.question_text,
          option_a: item.option_a,
          option_b: item.option_b,
          option_c: item.option_c,
          option_d: item.option_d,
          correct_option: item.correct_option,
          explanation: item.explanation,
          source: item.source_type === 'pyq' ? 'pyq' : 'book',
          tags: [`pdf:${sourceName}`, `page:${item.source_page}`]
        });
        
        if (practiceError) {
          console.error("Practice insert error:", practiceError);
          // We continue to try RAG even if practice fails, though transaction safety is better.
        } else {
          practiceInserted++;
        }
        
        // Insert into RAG Knowledge Base
        const { error: ragError } = await supabase.from('knowledge_base').insert({
          content: textsToEmbed[j],
          metadata: { 
            document_hash, 
            source: sourceName, 
            subject, 
            topic,
            content_type: 'mcq',
            source_type: item.source_type,
            question_number: item.question_number,
            page_start: item.source_page,
            exam: item.exam,
            year: item.year
          },
          embedding: embeddings[j]
        });
        
        if (ragError) {
          console.error("RAG insert error:", ragError);
        } else {
          ragInserted++;
        }
      }
    }

    return NextResponse.json({ 
      success: true, 
      report: {
        total_mcqs_detected: mcqs.length,
        valid: validMcqs.length,
        rejected,
        practice_inserted: practiceInserted,
        rag_inserted: ragInserted,
        duplicates_skipped: duplicatesSkipped
      }
    });

  } catch (error: any) {
    console.error("Confirm API Error:", error);
    return NextResponse.json({ error: error.message || "Failed to confirm and embed" }, { status: 500 });
  }
}
