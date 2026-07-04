-- Add missing columns to test_attempts table
ALTER TABLE test_attempts
  ADD COLUMN IF NOT EXISTS mode TEXT DEFAULT 'practice',
  ADD COLUMN IF NOT EXISTS score NUMERIC,
  ADD COLUMN IF NOT EXISTS total_marks INTEGER,
  ADD COLUMN IF NOT EXISTS correct_count INTEGER,
  ADD COLUMN IF NOT EXISTS wrong_count INTEGER,
  ADD COLUMN IF NOT EXISTS unattempted_count INTEGER,
  ADD COLUMN IF NOT EXISTS accuracy_percent NUMERIC,
  ADD COLUMN IF NOT EXISTS time_taken_seconds INTEGER,
  ADD COLUMN IF NOT EXISTS started_at TIMESTAMP WITH TIME ZONE,
  ADD COLUMN IF NOT EXISTS submitted_at TIMESTAMP WITH TIME ZONE;

-- Force the schema cache to reload
NOTIFY pgrst, 'reload schema';
