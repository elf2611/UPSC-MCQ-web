import { NextRequest, NextResponse } from "next/server";
import { verifyUserToken } from "@/lib/auth-verify";
import { buildMentorContext } from "@/lib/ai/context-builder";
import { aiMentorTools, executeTool } from "@/lib/ai/tools";
import { sanitizeJSON } from "@/lib/ai/gemini";

const MAX_ITERATIONS = 3;

export async function POST(req: NextRequest) {
  try {
    const authRes = await verifyUserToken(req);
    if (!authRes.ok) {
      return NextResponse.json({ error: authRes.error }, { status: 401 });
    }

    const { message, history = [] } = await req.json();
    if (!message) {
      return NextResponse.json({ error: "Message is required" }, { status: 400 });
    }

    const apiKey = process.env.GEMINI_API_KEY;
    const modelName = process.env.GEMINI_MODEL || "gemini-1.5-flash";
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${apiKey}`;

    const context = await buildMentorContext(authRes.uid);
    
    // Construct initial prompt contents
    const contents: any[] = [
      { role: "user", parts: [{ text: context }] },
      { role: "model", parts: [{ text: "Understood. I am Prepwise AI Mentor." }] }
    ];

    // Append history
    for (const msg of history) {
      contents.push({
        role: msg.role === 'assistant' ? 'model' : 'user',
        parts: [{ text: msg.content }]
      });
    }
    
    // Add new user message
    contents.push({ role: "user", parts: [{ text: message }] });

    let iterations = 0;
    let finalAnswer = "";

    while (iterations < MAX_ITERATIONS) {
      iterations++;
      
      const requestBody = {
        contents,
        tools: [{ functionDeclarations: aiMentorTools }],
        generationConfig: { temperature: 0.2 }
      };

      const response = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(requestBody)
      });

      if (!response.ok) {
        throw new Error(`Gemini Error: ${response.status}`);
      }

      const data = await response.json();
      const candidate = data.candidates?.[0];
      const part = candidate?.content?.parts?.[0];

      if (!part) {
        throw new Error("Empty response from Gemini");
      }

      // Check for function call
      if (part.functionCall) {
        const { name, args } = part.functionCall;
        
        // Execute tool SECURELY (using authRes.uid, NEVER trusting args for userId)
        const toolResult = await executeTool(name, args, authRes.uid);
        
        // Append function call and function response to contents so Gemini can continue
        contents.push({
          role: "model",
          parts: [{ functionCall: part.functionCall }]
        });
        
        contents.push({
          role: "function", 
          parts: [{
            functionResponse: {
              name,
              response: { result: toolResult }
            }
          }]
        });
        
      } else if (part.text) {
        // Final text answer
        finalAnswer = part.text;
        break;
      } else {
        break;
      }
    }

    if (!finalAnswer) {
      finalAnswer = "I'm sorry, I couldn't generate an answer or I reached the maximum thinking limit.";
    }

    return NextResponse.json({ reply: finalAnswer });

  } catch (error: any) {
    console.error("AI Mentor API Error:", error);
    return NextResponse.json({ error: error.message || "Internal Server Error" }, { status: 500 });
  }
}
