CREATE TABLE IF NOT EXISTS doubt_threads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  subject_id UUID REFERENCES subjects(id) ON DELETE SET NULL,
  question_id UUID REFERENCES questions(id) ON DELETE SET NULL,
  title TEXT NOT NULL DEFAULT 'New Doubt',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS doubt_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  thread_id UUID NOT NULL REFERENCES doubt_threads(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('user', 'assistant', 'system')),
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- RLS
ALTER TABLE doubt_threads ENABLE ROW LEVEL SECURITY;
ALTER TABLE doubt_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their own doubt threads"
  ON doubt_threads
  FOR ALL
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- doubt_messages RLS must check the thread's user_id
CREATE POLICY "Users can manage their own doubt messages"
  ON doubt_messages
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM doubt_threads
      WHERE doubt_threads.id = doubt_messages.thread_id
      AND doubt_threads.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM doubt_threads
      WHERE doubt_threads.id = doubt_messages.thread_id
      AND doubt_threads.user_id = auth.uid()
    )
  );

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_doubt_threads_user_id ON doubt_threads(user_id);
CREATE INDEX IF NOT EXISTS idx_doubt_messages_thread_id ON doubt_messages(thread_id);
