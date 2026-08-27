import { NextRequest, NextResponse } from "next/server";
import { verifyUserToken, getUserTier, getSupabaseAdmin } from "@/lib/auth-verify";

export const runtime = 'edge'; // Optional for faster streaming

export async function POST(req: NextRequest) {
  try {
    const authRes = await verifyUserToken(req);
    if (!authRes.ok) {
      return NextResponse.json({ error: authRes.error }, { status: 401 });
    }

    const { threadId, message, questionId } = await req.json();
    if (!message) {
      return NextResponse.json({ error: "Message is required" }, { status: 400 });
    }

    const tier = await getUserTier(authRes.uid);
    const supabaseAdmin = getSupabaseAdmin();

    // 1. Rate Limiting Check
    // We check how many messages the user sent today
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const { } = await supabaseAdmin
      .from('doubt_messages')
      .select('id', { count: 'exact', head: true })
      .eq('role', 'user')
      .gte('created_at', today.toISOString());
    // Wait, the RLS for doubt_messages doesn't directly have user_id. We must join with doubt_threads.
    // Instead of complex join in Supabase client, we'll fetch threads first or just query doubt_threads for this user.
    // Actually, simpler: 
    const { data: userThreads } = await supabaseAdmin
      .from('doubt_threads')
      .select('id')
      .eq('user_id', authRes.uid);

    if (userThreads && userThreads.length > 0) {
      const threadIds = userThreads.map(t => t.id);
      const { count: msgCount } = await supabaseAdmin
        .from('doubt_messages')
        .select('id', { count: 'exact', head: true })
        .in('thread_id', threadIds)
        .eq('role', 'user')
        .gte('created_at', today.toISOString());
        
      const dailyLimit = tier === 'elite' ? 1000 : (tier === 'premium' ? 200 : 10);
      if (msgCount && msgCount >= dailyLimit) {
        return NextResponse.json({ 
          error: `Daily doubt limit reached (${dailyLimit}). Upgrades available or resets at midnight.` 
        }, { status: 429 });
      }
    }

    // 2. Fetch or Create Thread
    let activeThreadId = threadId;
    if (!activeThreadId) {
      const { data: newThread, error: threadError } = await supabaseAdmin
        .from('doubt_threads')
        .insert({
          user_id: authRes.uid,
          question_id: questionId || null,
          title: message.substring(0, 40) + '...'
        })
        .select()
        .single();
      
      if (threadError) throw new Error("Failed to create thread");
      activeThreadId = newThread.id;
    }

    // Save User Message
    await supabaseAdmin.from('doubt_messages').insert({
      thread_id: activeThreadId,
      role: 'user',
      content: message
    });

    // 3. Fetch Context (Question + Previous Messages)
    let contextString = "";
    if (questionId) {
      const { data: question } = await supabaseAdmin
        .from('questions')
        .select('*')
        .eq('id', questionId)
        .single();
        
      if (question) {
        contextString = `
Context Question:
${question.question_text}
Options: A) ${question.option_a} B) ${question.option_b} C) ${question.option_c} D) ${question.option_d}
Correct: ${question.correct_option}
Explanation: ${question.explanation}
`;
      }
    }

    const { data: history } = await supabaseAdmin
      .from('doubt_messages')
      .select('role, content')
      .eq('thread_id', activeThreadId)
      .order('created_at', { ascending: true })
      .limit(10); // last 10 messages for context

    // 4. Construct Gemini Prompt
    const systemPrompt = `You are a strict, concise, and highly accurate UPSC examiner and tutor. 
Your goal is to clear the aspirant's doubt quickly. DO NOT write long essays. Bullet points are preferred.
If you are not certain about a fact, say "I am not certain, please verify with NCERT/standard sources."
Do not hallucinate.

${contextString}`;

    const contents = [];
    contents.push({ role: 'user', parts: [{ text: systemPrompt }] });
    contents.push({ role: 'model', parts: [{ text: "Understood. I am ready to clear the aspirant's doubt concisely." }] });
    
    if (history) {
      for (const msg of history) {
        // Gemini roles: 'user' or 'model'
        const gRole = msg.role === 'assistant' ? 'model' : 'user';
        contents.push({ role: gRole, parts: [{ text: msg.content }] });
      }
    } else {
      contents.push({ role: 'user', parts: [{ text: message }] });
    }

    // 5. Call Gemini with Streaming
    const apiKey = process.env.GEMINI_API_KEY;
    const modelName = process.env.GEMINI_MODEL || "gemini-1.5-pro";
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:streamGenerateContent?alt=sse&key=${apiKey}`;

    const geminiRes = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents,
        generationConfig: { temperature: 0.3 }
      })
    });

    if (!geminiRes.ok) {
      const errText = await geminiRes.text();
      console.error("Gemini stream error:", errText);
      return NextResponse.json({ error: "AI Service temporarily unavailable." }, { status: 500 });
    }

    // We create a TransformStream to:
    // 1. Pass the SSE chunks to the client.
    // 2. Accumulate the full text to save into Supabase `doubt_messages`.
    let fullResponse = "";
    
    const transformStream = new TransformStream({
      transform(chunk, controller) {
        controller.enqueue(chunk);
        
        // Decode chunk to extract text and save it
        const decoded = new TextDecoder().decode(chunk);
        // SSE lines look like: data: {"candidates": [{"content": {"parts": [{"text": "Hello"}]}}]}
        const lines = decoded.split('\n');
        for (const line of lines) {
          if (line.startsWith('data: ') && line !== 'data: [DONE]') {
            try {
              const data = JSON.parse(line.substring(6));
              const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
              if (text) fullResponse += text;
            } catch (_e) {
              // ignore parse errors for partial chunks
            }
          }
        }
      },
      async flush() {
        // Stream ended, save assistant message
        if (fullResponse) {
          await supabaseAdmin.from('doubt_messages').insert({
            thread_id: activeThreadId,
            role: 'assistant',
            content: fullResponse
          });
        }
      }
    });

    return new Response(geminiRes.body?.pipeThrough(transformStream), {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        "Connection": "keep-alive",
        "X-Thread-Id": activeThreadId // Send thread ID back via headers so client knows
      }
    });

  } catch (error: unknown) {
    console.error("Doubt Ask API Error:", error);
    return NextResponse.json({ error: (error as Error).message || "Internal Server Error" }, { status: 500 });
  }
}
