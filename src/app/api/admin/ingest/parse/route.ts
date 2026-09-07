import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin, verifyAdminToken } from "@/lib/auth-verify";
import { extractUPSCBookStructure } from "@/lib/pdf/parser";
import crypto from 'crypto';

export async function POST(req: NextRequest) {
  try {
    // 1. Strict Server-Side Auth
    const authRes = await verifyAdminToken(req);
    if (!authRes.ok) {
      return NextResponse.json({ error: authRes.error }, { status: authRes.status });
    }

    const formData = await req.formData();
    const file = formData.get("pdf") as File | null;
    const sourceName = formData.get("sourceName") as string || "Unknown PDF";

    if (!file) {
      return NextResponse.json({ error: "No PDF file provided" }, { status: 400 });
    }

    if (file.type !== 'application/pdf') {
      return NextResponse.json({ error: "Invalid file type. Only PDFs are allowed." }, { status: 400 });
    }

    // 2. Hash and Duplicate Check
    const buffer = Buffer.from(await file.arrayBuffer());
    const hash = crypto.createHash('sha256').update(buffer).digest('hex');
    
    const supabase = getSupabaseAdmin();
    // Check knowledge_base for this document hash
    const { data: existing, error: dbError } = await supabase
      .from('knowledge_base')
      .select('id')
      .contains('metadata', { document_hash: hash })
      .limit(1);

    if (dbError) {
      console.error("Duplicate check error:", dbError);
    }

    const isDuplicatePdf = existing && existing.length > 0;

    // 3. Extraction & Structure Detection
    const { mcqs, concepts, total_pages } = await extractUPSCBookStructure(buffer, sourceName);
    
    // 4. Exact Text Duplicate Detection against practice_questions (or questions)
    // We check question_text against existing questions
    if (mcqs.length > 0) {
      // Simplified: fetch all question texts (for very large DBs, batch this)
      // We will do a generic check or let the confirm route handle it strictly.
      // For the preview, we'll just return the hash flag and let UI show warning.
    }

    // Embed hash in response so UI can send it back
    return NextResponse.json({ 
      success: true, 
      mcqs, 
      concepts, 
      total_pages,
      document_hash: hash,
      is_duplicate_pdf: isDuplicatePdf 
    });

  } catch (error: any) {
    console.error("PDF Parse API Error:", error);
    return NextResponse.json({ error: error.message || "Failed to parse PDF" }, { status: 500 });
  }
}
