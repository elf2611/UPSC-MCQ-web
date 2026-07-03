import { NextRequest, NextResponse } from "next/server";
import { Readability } from "@mozilla/readability";
import { JSDOM } from "jsdom";
// eslint-disable-next-line @typescript-eslint/no-require-imports
const pdfParse = require("pdf-parse");

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const type = formData.get("type") as string;

    if (type === "url") {
      const url = formData.get("url") as string;
      if (!url) return NextResponse.json({ error: "URL is required" }, { status: 400 });

      // Fetch URL and parse with Readability
      const response = await fetch(url, { headers: { "User-Agent": "Mozilla/5.0" } });
      if (!response.ok) throw new Error("Failed to fetch URL");
      
      const html = await response.text();
      const dom = new JSDOM(html, { url });
      const reader = new Readability(dom.window.document);
      const article = reader.parse();

      if (!article || !article.textContent) {
        throw new Error("Could not extract main article content");
      }

      // Basic cleanup
      const cleanText = article.textContent.replace(/\n\s*\n/g, '\n\n').trim();
      return NextResponse.json({ text: cleanText, title: article.title });

    } else if (type === "pdf") {
      const file = formData.get("file") as File;
      if (!file) return NextResponse.json({ error: "File is required" }, { status: 400 });

      const buffer = Buffer.from(await file.arrayBuffer());
      const data = await pdfParse(buffer);
      
      return NextResponse.json({ text: data.text });
    }

    return NextResponse.json({ error: "Invalid type" }, { status: 400 });

  } catch (error: unknown) {
    console.error("Extraction error:", error);
    return NextResponse.json({ error: (error as Error).message || "Failed to extract content" }, { status: 500 });
  }
}
