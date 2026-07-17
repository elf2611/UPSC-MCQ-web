export interface GenerateRequestConfig {
  count: number;
  difficulty: "Easy" | "Medium" | "Hard" | "Mixed";
  upscLevel: "Prelims" | "Mains" | "Mixed";
  subject: string;
  topic: string;
  language: "English" | "Hindi";
  explanationLength: "Short" | "Medium" | "Detailed";
  includeEliminationTips: boolean;
  autoGenerateTags: boolean;
  source: string;
}

export interface GeneratedQuestion {
  question_text: string;
  option_a: string;
  option_b: string;
  option_c: string;
  option_d: string;
  correct_option: "A" | "B" | "C" | "D";
  explanation: string;
  why_a_wrong?: string;
  why_b_wrong?: string;
  why_c_wrong?: string;
  why_d_wrong?: string;
  elimination_tip?: string;
  memory_trick?: string;
  static_topic_link?: string;
  related_current_affairs?: string;
  difficulty: "Easy" | "Medium" | "Hard";
  estimated_solving_time: number;
  subject: string;
  topic: string;
  subtopic?: string;
  tags: string[];
  source: string;
  year?: number;
  revision_priority: "low" | "normal" | "high";
}

export interface GenerateRequestPayload {
  text: string;
  config: GenerateRequestConfig;
}
