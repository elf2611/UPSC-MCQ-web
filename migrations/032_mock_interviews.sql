CREATE TABLE IF NOT EXISTS interview_questions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  category TEXT NOT NULL,
  question_text TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS interview_responses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  question_id UUID REFERENCES interview_questions(id) ON DELETE CASCADE,
  response_text TEXT NOT NULL,
  score_total INTEGER,
  feedback_confidence TEXT,
  feedback_structure TEXT,
  feedback_content TEXT,
  submitted_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE interview_questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE interview_responses ENABLE ROW LEVEL SECURITY;

-- Allow all authenticated users to read questions
CREATE POLICY "Anyone can read interview questions" ON interview_questions FOR SELECT USING (true);
CREATE POLICY "Users can manage own responses" ON interview_responses FOR ALL USING (auth.uid()::text = user_id);

-- Insert some dummy questions
INSERT INTO interview_questions (category, question_text) VALUES 
('Situational', 'You are the DM of a district facing severe communal riots. What are your first 3 steps?'),
('DAF', 'Why do you want to join the Civil Services when you already have a lucrative corporate career?'),
('Ethics', 'Describe a situation where you had to compromise your personal values for a professional obligation.')
ON CONFLICT DO NOTHING;
