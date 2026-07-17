-- Lock down questions table completely
ALTER TABLE questions ENABLE ROW LEVEL SECURITY;

-- Drop any permissive policies
DROP POLICY IF EXISTS "questions_read_all" ON questions;
DROP POLICY IF EXISTS "Enable read access for all users" ON questions;
DROP POLICY IF EXISTS "questions_update_auth" ON questions;
DROP POLICY IF EXISTS "questions_delete_auth" ON questions;

-- We explicitly do NOT create any new policies for questions. 
-- Only the service_role key will be able to read/write questions.
