-- STEP 1: ALTER existing tables to add missing columns

-- Add differentiator columns to questions table
ALTER TABLE questions 
  ADD COLUMN IF NOT EXISTS why_a_wrong TEXT,
  ADD COLUMN IF NOT EXISTS why_b_wrong TEXT,
  ADD COLUMN IF NOT EXISTS why_c_wrong TEXT,
  ADD COLUMN IF NOT EXISTS why_d_wrong TEXT,
  ADD COLUMN IF NOT EXISTS elimination_tip TEXT,
  ADD COLUMN IF NOT EXISTS memory_trick TEXT,
  ADD COLUMN IF NOT EXISTS static_topic_link TEXT,
  ADD COLUMN IF NOT EXISTS related_current_affairs TEXT,
  ADD COLUMN IF NOT EXISTS estimated_solving_time INTEGER,
  ADD COLUMN IF NOT EXISTS revision_priority TEXT DEFAULT 'normal',
  ADD COLUMN IF NOT EXISTS source TEXT DEFAULT 'original',
  ADD COLUMN IF NOT EXISTS year INTEGER,
  ADD COLUMN IF NOT EXISTS tags TEXT[] DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS language TEXT DEFAULT 'en',
  ADD COLUMN IF NOT EXISTS created_by TEXT,
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT NOW();

-- Add gamification + streak columns to profiles
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS xp INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS level INTEGER DEFAULT 1,
  ADD COLUMN IF NOT EXISTS coins INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS streak_count INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS last_active DATE,
  ADD COLUMN IF NOT EXISTS notifications_enabled BOOLEAN DEFAULT true,
  ADD COLUMN IF NOT EXISTS autosave_enabled BOOLEAN DEFAULT true,
  ADD COLUMN IF NOT EXISTS role TEXT DEFAULT 'student';

-- Add topic_id to user_statistics if it already exists
ALTER TABLE user_statistics
  ADD COLUMN IF NOT EXISTS topic_id UUID REFERENCES topics(id) ON DELETE CASCADE;



-- STEP 2: CREATE new tables

CREATE TABLE IF NOT EXISTS subjects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  slug TEXT UNIQUE,
  icon TEXT,
  color TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS topics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  subject_id UUID REFERENCES subjects(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  slug TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS bookmarks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL,
  question_id UUID REFERENCES questions(id) ON DELETE CASCADE,
  folder_name TEXT DEFAULT 'General',
  notes TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(user_id, question_id)
);

CREATE TABLE IF NOT EXISTS revision_queue (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL,
  question_id UUID REFERENCES questions(id) ON DELETE CASCADE,
  next_review_date DATE NOT NULL DEFAULT CURRENT_DATE + 1,
  interval_days INTEGER DEFAULT 1,
  ease_factor NUMERIC DEFAULT 2.5,
  repetitions INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(user_id, question_id)
);

CREATE TABLE IF NOT EXISTS user_statistics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL,
  subject_id UUID REFERENCES subjects(id) ON DELETE CASCADE,
  topic_id UUID REFERENCES topics(id) ON DELETE CASCADE,
  total_attempted INTEGER DEFAULT 0,
  total_correct INTEGER DEFAULT 0,
  accuracy_percent NUMERIC DEFAULT 0,
  avg_time_seconds NUMERIC DEFAULT 0,
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Note: We use conditional unique indices instead of a UNIQUE constraint 
-- so we can track both subject-level (topic_id IS NULL) and topic-level stats independently.
CREATE UNIQUE INDEX IF NOT EXISTS user_stat_unique_topic 
  ON user_statistics (user_id, subject_id, topic_id) 
  WHERE topic_id IS NOT NULL;
  
CREATE UNIQUE INDEX IF NOT EXISTS user_stat_unique_subject 
  ON user_statistics (user_id, subject_id) 
  WHERE topic_id IS NULL;

CREATE TABLE IF NOT EXISTS achievements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL,
  badge_name TEXT NOT NULL,
  badge_type TEXT,
  earned_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(user_id, badge_name)
);

CREATE TABLE IF NOT EXISTS daily_current_affairs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT,
  source_url TEXT,
  source_text TEXT,
  article_date DATE DEFAULT CURRENT_DATE,
  subject_id UUID REFERENCES subjects(id),
  created_at TIMESTAMP DEFAULT NOW()
);


-- STEP 3: Seed subjects
INSERT INTO subjects (name, slug, icon, color) VALUES
('Polity', 'polity', '⚖️', '#6366f1'),
('History', 'history', '📜', '#f59e0b'),
('Geography', 'geography', '🌍', '#10b981'),
('Economy', 'economy', '📈', '#3b82f6'),
('Environment', 'environment', '🌿', '#22c55e'),
('Science & Tech', 'science-tech', '🔬', '#8b5cf6'),
('Current Affairs', 'current-affairs', '📰', '#ef4444')
ON CONFLICT (slug) DO NOTHING;

CREATE TABLE IF NOT EXISTS question_attempts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL,
  question_id UUID REFERENCES questions(id) ON DELETE CASCADE,
  is_correct BOOLEAN,
  attempt_date DATE DEFAULT CURRENT_DATE,
  created_at TIMESTAMP DEFAULT NOW()
);
