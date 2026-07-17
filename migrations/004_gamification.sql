CREATE TABLE IF NOT EXISTS revision_queue (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  question_id UUID REFERENCES questions(id) ON DELETE CASCADE,
  next_review_date DATE NOT NULL DEFAULT CURRENT_DATE + 1,
  interval_days INTEGER DEFAULT 1,
  ease_factor NUMERIC DEFAULT 2.5,
  repetitions INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, question_id)
);

CREATE TABLE IF NOT EXISTS user_statistics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  subject_id UUID REFERENCES subjects(id) ON DELETE CASCADE,
  topic_id UUID REFERENCES topics(id) ON DELETE CASCADE,
  total_attempted INTEGER DEFAULT 0,
  total_correct INTEGER DEFAULT 0,
  accuracy_percent NUMERIC DEFAULT 0,
  avg_time_seconds NUMERIC DEFAULT 0,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS achievements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  badge_name TEXT NOT NULL,
  badge_type TEXT,
  earned_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, badge_name)
);

CREATE TABLE IF NOT EXISTS daily_current_affairs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT,
  source_url TEXT,
  source_text TEXT,
  article_date DATE DEFAULT CURRENT_DATE,
  subject_id UUID REFERENCES subjects(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
