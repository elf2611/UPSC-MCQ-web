-- ============================================================
-- PREPWISE SUPABASE COMPLETE DATABASE SETUP
-- 
-- HOW TO RUN:
--   1. Go to https://supabase.com/dashboard/project/apgpsutomkgktthpkrhz
--   2. Click "SQL Editor" in the left sidebar
--   3. Paste this ENTIRE script and click "RUN"
-- ============================================================


-- ============================================================
-- PART 1: CREATE TABLES (safe — won't overwrite existing data)
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
-- PART 2: ADD ALL MISSING COLUMNS TO questions TABLE
-- Uses "why_x_wrong" column names (matching AI output format)
-- ============================================================

ALTER TABLE questions ADD COLUMN IF NOT EXISTS why_a_wrong TEXT DEFAULT '';
ALTER TABLE questions ADD COLUMN IF NOT EXISTS why_b_wrong TEXT DEFAULT '';
ALTER TABLE questions ADD COLUMN IF NOT EXISTS why_c_wrong TEXT DEFAULT '';
ALTER TABLE questions ADD COLUMN IF NOT EXISTS why_d_wrong TEXT DEFAULT '';
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
ALTER TABLE questions ADD COLUMN IF NOT EXISTS created_by TEXT;


-- ============================================================
-- PART 3: FIX ROW LEVEL SECURITY POLICIES
-- This fixes "new row violates row-level security" errors
-- ============================================================

ALTER TABLE questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE subjects ENABLE ROW LEVEL SECURITY;
ALTER TABLE topics ENABLE ROW LEVEL SECURITY;

-- Remove old/conflicting policies
DROP POLICY IF EXISTS "Allow public read" ON questions;
DROP POLICY IF EXISTS "Allow authenticated insert" ON questions;
DROP POLICY IF EXISTS "Allow authenticated update" ON questions;
DROP POLICY IF EXISTS "Allow authenticated delete" ON questions;
DROP POLICY IF EXISTS "Allow all for authenticated" ON questions;
DROP POLICY IF EXISTS "Allow public read" ON subjects;
DROP POLICY IF EXISTS "Allow authenticated all" ON subjects;
DROP POLICY IF EXISTS "Allow all for authenticated" ON subjects;
DROP POLICY IF EXISTS "Allow public read" ON topics;
DROP POLICY IF EXISTS "Allow authenticated all" ON topics;
DROP POLICY IF EXISTS "Allow all for authenticated" ON topics;

-- QUESTIONS policies
CREATE POLICY "questions_read_all" ON questions FOR SELECT USING (true);
CREATE POLICY "questions_insert_auth" ON questions FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "questions_update_auth" ON questions FOR UPDATE TO authenticated USING (true);
CREATE POLICY "questions_delete_auth" ON questions FOR DELETE TO authenticated USING (true);

-- SUBJECTS policies  
CREATE POLICY "subjects_read_all" ON subjects FOR SELECT USING (true);
CREATE POLICY "subjects_write_auth" ON subjects FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- TOPICS policies
CREATE POLICY "topics_read_all" ON topics FOR SELECT USING (true);
CREATE POLICY "topics_write_auth" ON topics FOR ALL TO authenticated USING (true) WITH CHECK (true);


-- ============================================================
-- PART 4: VERIFY — run this to confirm all columns exist
-- ============================================================

SELECT column_name, data_type, column_default
FROM information_schema.columns 
WHERE table_name = 'questions' 
ORDER BY ordinal_position;
