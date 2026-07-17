-- Create subtopics table
CREATE TABLE IF NOT EXISTS subtopics (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  slug TEXT,
  topic_id UUID REFERENCES topics(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add subtopic to questions and staged_questions
ALTER TABLE questions
ADD COLUMN IF NOT EXISTS subtopic TEXT;

ALTER TABLE staged_questions
ADD COLUMN IF NOT EXISTS subtopic TEXT;
