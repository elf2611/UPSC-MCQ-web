-- Enable RLS to enforce default-deny posture for anon keys
ALTER TABLE daily_current_affairs ENABLE ROW LEVEL SECURITY;

-- Drop any existing policies that might be allowing unauthorized or inconsistent access
DROP POLICY IF EXISTS "daily_current_affairs_read_all" ON daily_current_affairs;
DROP POLICY IF EXISTS "daily_current_affairs_insert_all" ON daily_current_affairs;
DROP POLICY IF EXISTS "daily_current_affairs_update_all" ON daily_current_affairs;
DROP POLICY IF EXISTS "daily_current_affairs_delete_all" ON daily_current_affairs;

-- No permissive policies are created here.
-- Access is restricted to the Supabase service_role key, which bypasses RLS automatically.
