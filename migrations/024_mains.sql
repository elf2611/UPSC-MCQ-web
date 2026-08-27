CREATE TABLE IF NOT EXISTS mains_questions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  paper TEXT NOT NULL, -- e.g., 'GS-1', 'GS-2', 'GS-3', 'GS-4', 'Essay'
  topic TEXT NOT NULL,
  word_limit INTEGER NOT NULL DEFAULT 250,
  marks INTEGER NOT NULL DEFAULT 15,
  question_text TEXT NOT NULL,
  model_answer_notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS mains_answers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  question_id UUID NOT NULL REFERENCES mains_questions(id) ON DELETE CASCADE,
  answer_text TEXT NOT NULL,
  word_count INTEGER NOT NULL,
  score_content NUMERIC,
  score_structure NUMERIC,
  score_intro_conclusion NUMERIC,
  score_examples NUMERIC,
  score_word_discipline NUMERIC,
  score_total NUMERIC,
  feedback_text JSONB, -- stores the JSON feedback per dimension + overallFeedback
  submitted_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, question_id, submitted_at)
);

-- RLS
ALTER TABLE mains_questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE mains_answers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view mains questions"
  ON mains_questions
  FOR SELECT
  USING (true);



-- Indexes
CREATE INDEX IF NOT EXISTS idx_mains_questions_paper ON mains_questions(paper);
CREATE INDEX IF NOT EXISTS idx_mains_answers_user_id ON mains_answers(user_id);
CREATE INDEX IF NOT EXISTS idx_mains_answers_question_id ON mains_answers(question_id);
