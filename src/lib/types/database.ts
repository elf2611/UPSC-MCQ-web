export interface Profile {
  id: string;
  name?: string;
  email?: string;
  phone?: string;
  plan?: string;
  negative_marking?: boolean;
  created_at?: string;
  
  // Gamification & state
  xp?: number;
  level?: number;
  coins?: number;
  streak_count?: number;
  last_active?: string; 
  notifications_enabled?: boolean;
  autosave_enabled?: boolean;
  role?: string;
}

export interface Question {
  id: string; 
  subject?: string;
  topic?: string;
  difficulty?: string;
  year?: number;
  question_text?: string;
  option_a?: string;
  option_b?: string;
  option_c?: string;
  option_d?: string;
  correct_option?: string;
  explanation?: string;
  created_at?: string;

  // Differentiators
  why_a_wrong?: string;
  why_b_wrong?: string;
  why_c_wrong?: string;
  why_d_wrong?: string;
  elimination_tip?: string;
  memory_trick?: string;
  static_topic_link?: string;
  related_current_affairs?: string;
  estimated_solving_time?: number;
  revision_priority?: string;
  source?: string;
  tags?: string[];
  language?: string;
  created_by?: string;
  updated_at?: string;
}

export interface Test {
  id: string; 
  name?: string;
  description?: string;
  type?: string;
  question_count?: number;
  duration_mins?: number;
  created_at?: string;
}

export interface TestAttempt {
  id: string; 
  user_id?: string;
  test_id?: string;
  mode?: string;
  score?: number;
  total_questions?: number;
  attempted?: number;
  time_taken?: number;
  created_at?: string;
}

export interface AttemptAnswer {
  id: string; 
  attempt_id?: string;
  question_id?: string;
  selected_option?: string;
  is_correct?: boolean;
  is_marked?: boolean;
}

export interface Subject {
  id: string; 
  name: string;
  slug?: string;
  icon?: string;
  color?: string;
  created_at?: string;
}

export interface Topic {
  id: string; 
  subject_id?: string; 
  name: string;
  slug?: string;
  created_at?: string;
}

export interface Bookmark {
  id: string; 
  user_id: string;
  question_id?: string; 
  folder_name?: string;
  notes?: string;
  created_at?: string;
}

export interface RevisionQueueItem {
  id: string; 
  user_id: string;
  question_id?: string; 
  next_review_date: string; 
  interval_days?: number;
  ease_factor?: number;
  repetitions?: number;
  created_at?: string;
  updated_at?: string;
}

export interface UserStatistics {
  id: string; 
  user_id: string; 
  subject_id?: string;
  topic_id?: string; 
  total_attempted: number;
  total_correct: number;
  accuracy_percent: number; 
  avg_time_seconds: number; 
  updated_at?: string;
}

export interface Achievement {
  id: string; 
  user_id: string;
  badge_name: string;
  badge_type?: string;
  earned_at?: string;
}

export interface DailyCurrentAffairs {
  id: string; 
  title?: string;
  source_url?: string;
  source_text?: string;
  article_date?: string; 
  subject_id?: string; 
  created_at?: string;
}

export interface QuestionAttempt {
  id: string;
  user_id: string;
  question_id?: string;
  is_correct?: boolean;
  attempt_date?: string;
  created_at?: string;
}
