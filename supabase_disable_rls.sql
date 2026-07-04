ALTER TABLE test_attempts DISABLE ROW LEVEL SECURITY;
ALTER TABLE attempt_answers DISABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their own attempts" ON test_attempts;
DROP POLICY IF EXISTS "Users can insert their own attempts" ON test_attempts;
DROP POLICY IF EXISTS "Users can view answers for their attempts" ON attempt_answers;
DROP POLICY IF EXISTS "Users can insert answers for their attempts" ON attempt_answers;
