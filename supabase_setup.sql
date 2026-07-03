-- ============================================================
-- PREPWISE SUPABASE DATABASE SETUP
-- 
-- ⚡ HOW TO RUN THIS:
--   1. Go to https://supabase.com/dashboard
--   2. Select your project (apgpsutomkgktthpkrhz)
--   3. Click "SQL Editor" in the left sidebar
--   4. Paste this ENTIRE script and click "Run"
-- ============================================================


-- ============================================================
-- PART 1: CREATE TABLES (if they don't exist)
-- ============================================================

CREATE TABLE IF NOT EXISTS subjects (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  color TEXT DEFAULT '#6366f1',
  icon TEXT DEFAULT '📚',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS topics (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  subject_id UUID REFERENCES subjects(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS questions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  question_text TEXT NOT NULL,
  option_a TEXT NOT NULL,
  option_b TEXT NOT NULL,
  option_c TEXT NOT NULL,
  option_d TEXT NOT NULL,
  correct_option TEXT NOT NULL DEFAULT 'a',
  explanation TEXT DEFAULT '',
  difficulty TEXT DEFAULT 'medium',
  subject TEXT DEFAULT '',
  topic TEXT DEFAULT '',
  created_at TIMESTAMPTZ DEFAULT NOW()
);


-- ============================================================
-- PART 2: ADD MISSING COLUMNS TO questions TABLE
-- (Safe to run even if columns already exist)
-- ============================================================

ALTER TABLE questions ADD COLUMN IF NOT EXISTS option_a_explanation TEXT DEFAULT '';
ALTER TABLE questions ADD COLUMN IF NOT EXISTS option_b_explanation TEXT DEFAULT '';
ALTER TABLE questions ADD COLUMN IF NOT EXISTS option_c_explanation TEXT DEFAULT '';
ALTER TABLE questions ADD COLUMN IF NOT EXISTS option_d_explanation TEXT DEFAULT '';
ALTER TABLE questions ADD COLUMN IF NOT EXISTS elimination_tip TEXT DEFAULT '';
ALTER TABLE questions ADD COLUMN IF NOT EXISTS memory_trick TEXT DEFAULT '';
ALTER TABLE questions ADD COLUMN IF NOT EXISTS static_topic_link TEXT DEFAULT '';
ALTER TABLE questions ADD COLUMN IF NOT EXISTS related_current_affairs TEXT DEFAULT '';
ALTER TABLE questions ADD COLUMN IF NOT EXISTS estimated_solving_time INTEGER DEFAULT 60;
ALTER TABLE questions ADD COLUMN IF NOT EXISTS revision_priority TEXT DEFAULT 'normal';
ALTER TABLE questions ADD COLUMN IF NOT EXISTS source TEXT DEFAULT 'original';
ALTER TABLE questions ADD COLUMN IF NOT EXISTS year INTEGER;
ALTER TABLE questions ADD COLUMN IF NOT EXISTS tags TEXT[] DEFAULT '{}';
ALTER TABLE questions ADD COLUMN IF NOT EXISTS language TEXT DEFAULT 'en';
ALTER TABLE questions ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES auth.users(id);


-- ============================================================
-- PART 3: FIX ROW LEVEL SECURITY
-- This is what caused the "new row violates RLS policy" error
-- ============================================================

-- Enable RLS on tables (required before creating policies)
ALTER TABLE questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE subjects ENABLE ROW LEVEL SECURITY;
ALTER TABLE topics ENABLE ROW LEVEL SECURITY;

-- Drop old policies (if any exist)
DROP POLICY IF EXISTS "Allow public read" ON questions;
DROP POLICY IF EXISTS "Allow authenticated insert" ON questions;
DROP POLICY IF EXISTS "Allow authenticated update" ON questions;
DROP POLICY IF EXISTS "Allow authenticated delete" ON questions;
DROP POLICY IF EXISTS "Allow public read" ON subjects;
DROP POLICY IF EXISTS "Allow authenticated all" ON subjects;
DROP POLICY IF EXISTS "Allow public read" ON topics;
DROP POLICY IF EXISTS "Allow authenticated all" ON topics;

-- QUESTIONS: Anyone can read, logged-in users can write
CREATE POLICY "Allow public read" ON questions
  FOR SELECT USING (true);

CREATE POLICY "Allow authenticated insert" ON questions
  FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Allow authenticated update" ON questions
  FOR UPDATE TO authenticated USING (true);

CREATE POLICY "Allow authenticated delete" ON questions
  FOR DELETE TO authenticated USING (true);

-- SUBJECTS: Anyone can read, logged-in users can write
CREATE POLICY "Allow public read" ON subjects
  FOR SELECT USING (true);

CREATE POLICY "Allow authenticated all" ON subjects
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- TOPICS: Anyone can read, logged-in users can write
CREATE POLICY "Allow public read" ON topics
  FOR SELECT USING (true);

CREATE POLICY "Allow authenticated all" ON topics
  FOR ALL TO authenticated USING (true) WITH CHECK (true);


-- ============================================================
-- PART 4: VERIFY — shows all columns in questions table
-- ============================================================

SELECT column_name, data_type, column_default
FROM information_schema.columns 
WHERE table_name = 'questions' 
ORDER BY ordinal_position;
