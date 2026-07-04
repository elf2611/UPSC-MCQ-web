-- 1. Enable RLS on the tables if not already enabled
ALTER TABLE test_attempts ENABLE ROW LEVEL SECURITY;
ALTER TABLE attempt_answers ENABLE ROW LEVEL SECURITY;

-- 2. Create policy to allow users to view their own test attempts
DROP POLICY IF EXISTS "Users can view their own attempts" ON test_attempts;
CREATE POLICY "Users can view their own attempts" ON test_attempts 
  FOR SELECT USING (auth.uid() = user_id);

-- 3. Create policy to allow users to insert their own test attempts
DROP POLICY IF EXISTS "Users can insert their own attempts" ON test_attempts;
CREATE POLICY "Users can insert their own attempts" ON test_attempts 
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- 4. Create policy to allow users to view their own attempt answers
DROP POLICY IF EXISTS "Users can view answers for their attempts" ON attempt_answers;
CREATE POLICY "Users can view answers for their attempts" ON attempt_answers 
  FOR SELECT USING (
    attempt_id IN (SELECT id FROM test_attempts WHERE user_id = auth.uid())
  );

-- 5. Create policy to allow users to insert their own attempt answers
DROP POLICY IF EXISTS "Users can insert answers for their attempts" ON attempt_answers;
CREATE POLICY "Users can insert answers for their attempts" ON attempt_answers 
  FOR INSERT WITH CHECK (
    attempt_id IN (SELECT id FROM test_attempts WHERE user_id = auth.uid())
  );
