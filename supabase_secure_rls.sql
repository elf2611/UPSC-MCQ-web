-- Re-enable RLS securely for Prepwise
-- This script ensures default-deny posture for anon keys (used by client)
-- while allowing service_role (used by server/API routes) to bypass RLS.

-- 1. Enable RLS (if not already enabled)
ALTER TABLE test_attempts ENABLE ROW LEVEL SECURITY;
ALTER TABLE attempt_answers ENABLE ROW LEVEL SECURITY;

-- 2. Drop existing insecure or auth.uid()-based policies
DROP POLICY IF EXISTS "Users can view their own attempts" ON test_attempts;
DROP POLICY IF EXISTS "Users can insert their own attempts" ON test_attempts;
DROP POLICY IF EXISTS "Users can view answers for their attempts" ON attempt_answers;
DROP POLICY IF EXISTS "Users can insert answers for their attempts" ON attempt_answers;

-- By not creating any new policies with USING/WITH CHECK clauses, 
-- we enforce a default DENY for all anon and authenticated roles.
-- The Supabase service_role key will automatically bypass these restrictions.
