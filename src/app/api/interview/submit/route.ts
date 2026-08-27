import { NextRequest, NextResponse } from "next/server";
import { verifyUserToken, getSupabaseAdmin } from "@/lib/auth-verify";

export async function POST(req: NextRequest) {
  try {
    const authRes = await verifyUserToken(req);
    if (!authRes.ok) return NextResponse.json({ error: authRes.error }, { status: 401 });

    const { questionId, responseText } = await bodyParse(req);
    if (!responseText) return NextResponse.json({ error: "No response text" }, { status: 400 });

    const supabase = getSupabaseAdmin();

    // Get question
    const { data: q } = await supabase.from('interview_questions').select('*').eq('id', questionId).single();
    if (!q) return NextResponse.json({ error: "Question not found" }, { status: 404 });

    // Use Gemini via Fetch
    const prompt = `
      Act as a strict UPSC Interview Board Member. 
      Question: "${q.question_text}"
      Candidate's transcripted response: "${responseText}"
      
      Evaluate the candidate on a scale of 0-100 total. 
      Return ONLY a JSON object with these EXACT keys (no markdown formatting, no code blocks):
      {
        "score_total": 75,
        "feedback_confidence": "critique here",
        "feedback_structure": "critique here",
        "feedback_content": "critique here"
      }
    `;

    const apiKey = process.env.GEMINI_API_KEY;
    const modelName = "gemini-1.5-flash";
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${apiKey}`;

    const geminiRes = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ role: 'user', parts: [{ text: prompt }] }],
        generationConfig: { temperature: 0.1 }
      })
    });

    if (!geminiRes.ok) {
      const errText = await geminiRes.text();
      console.error(errText);
      throw new Error("Failed to get AI evaluation.");
    }

    const aiData = await geminiRes.json();
    let raw = aiData.candidates[0].content.parts[0].text;
    raw = raw.replace(/```json/g, '').replace(/```/g, '').trim();
    
    const aiFeedback = JSON.parse(raw);

    const { data: insertRes, error } = await supabase.from('interview_responses').insert({
      user_id: authRes.uid,
      question_id: questionId,
      response_text: responseText,
      score_total: aiFeedback.score_total,
      feedback_confidence: aiFeedback.feedback_confidence,
      feedback_structure: aiFeedback.feedback_structure,
      feedback_content: aiFeedback.feedback_content
    }).select().single();

    if (error) throw error;

    return NextResponse.json({ success: true, feedback: insertRes });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

async function bodyParse(req: NextRequest) {
  try {
    return await req.json();
  } catch {
    return {};
  }
}
