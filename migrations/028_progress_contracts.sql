CREATE TABLE IF NOT EXISTS progress_contracts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  goal_type TEXT NOT NULL CHECK (goal_type IN ('questions', 'accuracy', 'streak')),
  target_value NUMERIC NOT NULL,
  current_progress NUMERIC DEFAULT 0,
  start_date DATE NOT NULL DEFAULT CURRENT_DATE,
  end_date DATE NOT NULL,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'succeeded', 'failed')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE progress_contracts ENABLE ROW LEVEL SECURITY;

-- Note: We don't use auth.uid() here to match the service_role pattern established in previous migrations.
-- Secure API routes will handle user-scoping.

CREATE INDEX IF NOT EXISTS idx_progress_contracts_user_id ON progress_contracts(user_id);
CREATE INDEX IF NOT EXISTS idx_progress_contracts_status ON progress_contracts(status);
