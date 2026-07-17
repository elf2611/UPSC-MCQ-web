CREATE TABLE IF NOT EXISTS profiles (
  id TEXT PRIMARY KEY,
  name TEXT,
  email TEXT,
  plan TEXT DEFAULT 'free',
  role TEXT DEFAULT 'student',
  xp INTEGER DEFAULT 0,
  level INTEGER DEFAULT 1,
  coins INTEGER DEFAULT 0,
  streak_count INTEGER DEFAULT 0,
  last_active DATE,
  notifications_enabled BOOLEAN DEFAULT true,
  autosave_enabled BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS subjects (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  slug TEXT UNIQUE,
  color TEXT DEFAULT '#6366f1',
  icon TEXT DEFAULT '📚',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS topics (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  slug TEXT,
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
  why_a_wrong TEXT DEFAULT '',
  why_b_wrong TEXT DEFAULT '',
  why_c_wrong TEXT DEFAULT '',
  why_d_wrong TEXT DEFAULT '',
  elimination_tip TEXT DEFAULT '',
  memory_trick TEXT DEFAULT '',
  static_topic_link TEXT DEFAULT '',
  related_current_affairs TEXT DEFAULT '',
  estimated_solving_time INTEGER DEFAULT 60,
  revision_priority TEXT DEFAULT 'normal',
  source TEXT DEFAULT 'original',
  year INTEGER,
  tags TEXT[] DEFAULT '{}',
  language TEXT DEFAULT 'en',
  created_by TEXT,
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS bookmarks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  question_id UUID REFERENCES questions(id) ON DELETE CASCADE,
  folder_name TEXT DEFAULT 'General',
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, question_id)
);
