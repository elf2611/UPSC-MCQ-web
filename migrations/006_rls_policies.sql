-- Re-enable RLS securely for Prepwise
-- This script ensures default-deny posture for anon keys (used by client)
-- while allowing service_role (used by server/API routes) to bypass RLS.

-- 1. Enable RLS (if not already enabled)
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE subjects ENABLE ROW LEVEL SECURITY;
ALTER TABLE topics ENABLE ROW LEVEL SECURITY;
ALTER TABLE questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE bookmarks ENABLE ROW LEVEL SECURITY;
ALTER TABLE test_attempts ENABLE ROW LEVEL SECURITY;
ALTER TABLE attempt_answers ENABLE ROW LEVEL SECURITY;
ALTER TABLE question_attempts ENABLE ROW LEVEL SECURITY;
ALTER TABLE question_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE revision_queue ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_statistics ENABLE ROW LEVEL SECURITY;
ALTER TABLE achievements ENABLE ROW LEVEL SECURITY;
ALTER TABLE daily_current_affairs ENABLE ROW LEVEL SECURITY;

-- 2. Drop existing insecure or auth.uid()-based policies (clean slate)
DROP POLICY IF EXISTS "questions_read_all" ON questions;
DROP POLICY IF EXISTS "questions_insert_auth" ON questions;
DROP POLICY IF EXISTS "questions_update_auth" ON questions;
DROP POLICY IF EXISTS "questions_delete_auth" ON questions;
DROP POLICY IF EXISTS "subjects_read_all" ON subjects;
DROP POLICY IF EXISTS "subjects_write_auth" ON subjects;
DROP POLICY IF EXISTS "topics_read_all" ON topics;
DROP POLICY IF EXISTS "topics_write_auth" ON topics;

-- 3. Create permissive policies for public metadata
-- Subjects and topics are safe to be read publicly via anon key
CREATE POLICY "subjects_read_all" ON subjects FOR SELECT USING (true);
CREATE POLICY "topics_read_all" ON topics FOR SELECT USING (true);

-- All other tables (profiles, questions, bookmarks, test_attempts, etc.) 
-- have NO permissive policies. They are default DENY for anon/authenticated roles.
-- The Supabase service_role key will automatically bypass these restrictions 
-- when called from secure API routes.
