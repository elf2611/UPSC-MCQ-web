export interface ExplainRequestPayload {
  question_text: string;
  option_a: string;
  option_b: string;
  option_c: string;
  option_d: string;
  correct_option: string;
  subject?: string;
  topic?: string;
}

export interface DetailedExplanation {
  correct_explanation: string;
  why_others_wrong: {
    [key: string]: string; // e.g. "A": "Because...", "B": "Because..."
  };
  elimination_technique: string;
  memory_trick: string;
}
