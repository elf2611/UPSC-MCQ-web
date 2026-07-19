-- Enable RLS on staged_questions and set default deny
ALTER TABLE staged_questions ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  -- Drop existing policies if they exist to avoid conflicts when re-running
  DROP POLICY IF EXISTS "staged_questions_default_deny_anon" ON staged_questions;
  DROP POLICY IF EXISTS "staged_questions_default_deny_auth" ON staged_questions;
END $$;

-- Explicit deny for anon
CREATE POLICY "staged_questions_default_deny_anon"
  ON staged_questions
  FOR ALL
  TO anon
  USING (false);

-- Explicit deny for authenticated users (only service role should access this table)
CREATE POLICY "staged_questions_default_deny_auth"
  ON staged_questions
  FOR ALL
  TO authenticated
  USING (false);
