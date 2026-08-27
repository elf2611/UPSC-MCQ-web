export interface RubricDimension {
  name: string;
  maxScore: number;
  description: string;
}

export interface RubricScoringResult {
  scores: Record<string, number>;
  totalScore: number;
  feedback: Record<string, string>;
  overallFeedback: string;
}

export async function scoreAgainstRubric(
  answerText: string,
  questionContext: string,
  rubric: RubricDimension[]
): Promise<RubricScoringResult> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error("GEMINI_API_KEY is missing");
  }

  // Construct JSON Schema representation dynamically
  const scoresProperties: Record<string, any> = {};
  const feedbackProperties: Record<string, any> = {};

  rubric.forEach((dim) => {
    scoresProperties[dim.name] = {
      type: "number",
      description: `Score for ${dim.name} out of ${dim.maxScore}.`,
    };
    feedbackProperties[dim.name] = {
      type: "string",
      description: `Constructive feedback for ${dim.name}.`,
    };
  });

  const responseSchema = {
    type: "object",
    properties: {
      scores: {
        type: "object",
        properties: scoresProperties,
        required: rubric.map(d => d.name),
      },
      feedback: {
        type: "object",
        properties: feedbackProperties,
        required: rubric.map(d => d.name),
      },
      overallFeedback: {
        type: "string",
        description: "A summary paragraph of overall feedback and advice.",
      }
    },
    required: ["scores", "feedback", "overallFeedback"],
  };

  const rubricDescription = rubric
    .map((d) => `- ${d.name} (Max: ${d.maxScore}): ${d.description}`)
    .join("\n");

  const prompt = `
You are an expert UPSC examiner evaluating a subjective answer.
Evaluate the candidate's answer based on the following rubric:

${rubricDescription}

Context/Question:
${questionContext}

Candidate's Answer:
${answerText}

Be highly objective, critical, and specific. Do not inflate scores. Give actionable feedback.
  `;

  // We use REST API to avoid SDK dependency conflicts
  const modelName = process.env.GEMINI_MODEL || "gemini-1.5-pro"; 
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${apiKey}`;

  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: {
        temperature: 0.1,
        responseMimeType: "application/json",
        responseSchema
      }
    })
  });

  if (!response.ok) {
    const errText = await response.text();
    console.error("Gemini API Error:", response.status, errText);
    throw new Error(`Failed to score answer via Gemini: ${response.status}`);
  }

  const data = await response.json();
  const rawText = data.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!rawText) throw new Error("Gemini returned an empty response.");

  try {
    const parsed = JSON.parse(rawText) as RubricScoringResult;
    let totalScore = 0;
    for (const score of Object.values(parsed.scores)) {
      totalScore += score;
    }
    return {
      scores: parsed.scores,
      totalScore,
      feedback: parsed.feedback,
      overallFeedback: parsed.overallFeedback,
    };
  } catch (error) {
    console.error("Error parsing Gemini JSON:", error, rawText);
    throw new Error("Failed to parse AI scoring result.");
  }
}
