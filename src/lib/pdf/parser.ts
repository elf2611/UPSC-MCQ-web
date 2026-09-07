// eslint-disable-next-line @typescript-eslint/no-require-imports
const pdf = require('pdf-parse');

export interface ParsedMCQ {
  id: string; // generated client-side or during parsing
  question_number: number;
  question_text: string;
  option_a: string;
  option_b: string;
  option_c: string;
  option_d: string;
  correct_option: string;
  explanation: string;
  source_type: 'book' | 'pyq';
  exam?: string;
  year?: number;
  paper?: string;
  source_page?: number;
  answer_page?: number;
  confidence: number;
  is_duplicate?: boolean; // filled later by DB check
}

export interface ParsedConcept {
  id: string;
  heading: string;
  content: string;
  source_page: number;
}

function render_page(pageData: any) {
    const render_options = { normalizeWhitespace: false, disableCombineTextItems: false };
    return pageData.getTextContent(render_options)
    .then(function(textContent: any) {
        let text = '';
        let lastY = -1;
        for (const item of textContent.items) {
            if (lastY == item.transform[5] || !lastY) {
                text += item.str;
            } else {
                text += '\n' + item.str;
            }
            lastY = item.transform[5];
        }
        return `\n\n---PAGE_${pageData.pageNumber}---\n\n` + text;
    });
}

/**
 * Parses a PDF buffer and attempts to extract structured MCQs and Concepts.
 */
export async function extractUPSCBookStructure(buffer: Buffer, sourceName: string) {
  const pdfData = await pdf(buffer, { pagerender: render_page });
  const rawText = pdfData.text;

  // 1. Initial cleanup: remove obvious repeated headers/footers (simplified)
  // For a robust system, we would find repeating patterns. Here we do basic trim.
  const text = rawText.replace(/\r\n/g, '\n');

  // We will store extracted entities
  const mcqs: ParsedMCQ[] = [];
  const concepts: ParsedConcept[] = [];
  
  // To match Qs, Answers, and Explanations, we separate them into maps
  const questionMap = new Map<number, { text: string; page: number; options: any; source_type: 'book'|'pyq'; year?: number; exam?: string; paper?: string }>();
  const answerMap = new Map<number, { answer: string; page: number }>();
  const explanationMap = new Map<number, { text: string; page: number }>();

  // A basic heuristic parser. Real-world PDFs require heavily tuned regex.
  // Split by pages to track page numbers
  const pages = text.split(/---PAGE_(\d+)---/);
  
  let currentPage = 1;

  // Heuristic states
  let currentContext = 'concept'; // concept, questions, answers, explanations

  for (let i = 1; i < pages.length; i += 2) {
    currentPage = parseInt(pages[i], 10);
    const pageText = pages[i + 1] || "";
    
    // Detect context changes based on headings
    if (/(?:answer key|answers)\s*$/im.test(pageText.substring(0, 500))) {
      currentContext = 'answers';
    } else if (/(?:explanations|hints and solutions)\s*$/im.test(pageText.substring(0, 500))) {
      currentContext = 'explanations';
    } else if (/(?:multiple choice questions|mcqs|prelims practice)\s*$/im.test(pageText.substring(0, 500))) {
      currentContext = 'questions';
    }
    
    // Extract items based on context
    if (currentContext === 'questions' || pageText.match(/Q\s*\d+\.|^\d+\./m)) {
      extractQuestionsFromPage(pageText, currentPage, questionMap);
    }
    
    if (currentContext === 'answers' || pageText.match(/^\d+\.\s*[A-D]\b/m)) {
      extractAnswersFromPage(pageText, currentPage, answerMap);
    }
    
    if (currentContext === 'explanations' || pageText.match(/^(?:Sol|Exp|Explanation)\s*\d+\./im)) {
      extractExplanationsFromPage(pageText, currentPage, explanationMap);
    }
    
    // If it's a concept page, we can extract chunks (stubbed here for brevity)
    if (currentContext === 'concept' && pageText.trim().length > 200) {
      concepts.push({
        id: `concept_p${currentPage}_${Math.random().toString(36).substring(7)}`,
        heading: `Chapter excerpt from ${sourceName} (Page ${currentPage})`,
        content: pageText.trim().substring(0, 2000), // simplistic chunking
        source_page: currentPage
      });
    }
  }

  // 2. Reconcile Matches
  questionMap.forEach((qData, qNum) => {
    const aData = answerMap.get(qNum);
    const eData = explanationMap.get(qNum);
    
    let confidence = 30;
    if (aData) confidence += 40;
    if (eData) confidence += 29;
    
    // Only map if we at least have an answer
    if (aData) {
      mcqs.push({
        id: `parsed_mcq_${qNum}_${Math.random().toString(36).substring(7)}`,
        question_number: qNum,
        question_text: qData.text,
        option_a: qData.options.A || "Option A",
        option_b: qData.options.B || "Option B",
        option_c: qData.options.C || "Option C",
        option_d: qData.options.D || "Option D",
        correct_option: aData.answer,
        explanation: eData?.text || "No explanation provided in source.",
        source_type: qData.source_type,
        year: qData.year,
        exam: qData.exam,
        paper: qData.paper,
        source_page: qData.page,
        answer_page: aData.page,
        confidence: confidence
      });
    }
  });

  return { mcqs, concepts, total_pages: pdfData.numpages };
}

// --- Heuristic Helpers ---

function extractQuestionsFromPage(text: string, page: number, qMap: Map<number, any>) {
  // Regex to find "1. Question text (a) Opt (b) Opt (c) Opt (d) Opt"
  // This is a highly simplified regex for demonstration.
  const qBlockRegex = /(?:^|\n)(?:Q)?(\d+)\.\s+([\s\S]*?)(?=(?:^|\n)(?:Q)?\d+\.\s+|$)/g;
  let match;
  
  while ((match = qBlockRegex.exec(text)) !== null) {
    const qNum = parseInt(match[1], 10);
    const fullText = match[2];
    
    // Split into question and options
    const optRegex = /(?:\([A-D]\)|[A-D]\))\s+/ig;
    const parts = fullText.split(optRegex);
    
    if (parts.length >= 5) {
      const qText = parts[0].trim();
      
      // PYQ Classification: strictly based on explicit mentions in the text preceding or inside the question
      let source_type: 'book' | 'pyq' = 'book';
      let year, exam, paper;
      
      // Look for explicit markers like "UPSC CSE 2021" or "Previous Year Question"
      const pyqMarker = /(UPSC\s*CSE|Civil Services|IAS)\s*(?:Prelims|Mains)?\s*(?:Paper\s*[IVX]+)?\s*(20\d{2}|19\d{2})/i;
      const markerMatch = qText.match(pyqMarker);
      if (markerMatch) {
        source_type = 'pyq';
        exam = markerMatch[1].trim();
        year = parseInt(markerMatch[2], 10);
      }

      qMap.set(qNum, {
        text: qText,
        options: {
          A: parts[1].trim(),
          B: parts[2].trim(),
          C: parts[3].trim(),
          D: parts[4].trim()
        },
        page,
        source_type,
        exam,
        year,
        paper
      });
    }
  }
}

function extractAnswersFromPage(text: string, page: number, aMap: Map<number, any>) {
  // Matches "1. B", "1-A", "1) C"
  const aRegex = /(?:^|\s)(\d+)[.\-)]\s*([A-D])\b/ig;
  let match;
  while ((match = aRegex.exec(text)) !== null) {
    const qNum = parseInt(match[1], 10);
    const ans = match[2].toUpperCase();
    if (!aMap.has(qNum)) {
      aMap.set(qNum, { answer: ans, page });
    }
  }
}

function extractExplanationsFromPage(text: string, page: number, eMap: Map<number, any>) {
  // Matches "1. Explanation text..." up to the next number
  const eRegex = /(?:^|\n)(?:Sol|Exp|Explanation)?\s*(\d+)\.\s+([\s\S]*?)(?=(?:^|\n)(?:Sol|Exp|Explanation)?\s*\d+\.\s+|$)/g;
  let match;
  while ((match = eRegex.exec(text)) !== null) {
    const qNum = parseInt(match[1], 10);
    const expText = match[2].trim();
    if (!eMap.has(qNum)) {
      eMap.set(qNum, { text: expText, page });
    }
  }
}
