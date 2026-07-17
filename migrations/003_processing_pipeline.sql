CREATE TABLE IF NOT EXISTS question_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  question_id UUID REFERENCES questions(id) ON DELETE CASCADE,
  previous_data JSONB,
  edited_by TEXT REFERENCES profiles(id) ON DELETE SET NULL,
  edited_at TIMESTAMPTZ DEFAULT NOW()
);
