CREATE TABLE IF NOT EXISTS study_plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  week_start_date DATE NOT NULL,
  generated_at TIMESTAMPTZ DEFAULT NOW(),
  input_snapshot JSONB,
  UNIQUE(user_id, week_start_date)
);

CREATE TABLE IF NOT EXISTS study_plan_days (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  plan_id UUID NOT NULL REFERENCES study_plans(id) ON DELETE CASCADE,
  day_date DATE NOT NULL,
  subject_id UUID REFERENCES subjects(id) ON DELETE SET NULL,
  subject_name TEXT, -- Denormalized for easier UI rendering if subject_id is null
  action_type TEXT NOT NULL CHECK (action_type IN ('practice', 'revision', 'mock', 'sectional_test')),
  target_count INTEGER NOT NULL DEFAULT 10,
  completed BOOLEAN DEFAULT false,
  completed_at TIMESTAMPTZ,
  UNIQUE(plan_id, day_date)
);

-- RLS
ALTER TABLE study_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE study_plan_days ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their own study plans"
  ON study_plans
  FOR ALL
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can manage their own study plan days"
  ON study_plan_days
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM study_plans
      WHERE study_plans.id = study_plan_days.plan_id
      AND study_plans.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM study_plans
      WHERE study_plans.id = study_plan_days.plan_id
      AND study_plans.user_id = auth.uid()
    )
  );

-- Indexes
CREATE INDEX IF NOT EXISTS idx_study_plans_user_id ON study_plans(user_id);
CREATE INDEX IF NOT EXISTS idx_study_plans_week ON study_plans(week_start_date);
CREATE INDEX IF NOT EXISTS idx_study_plan_days_plan_id ON study_plan_days(plan_id);
CREATE INDEX IF NOT EXISTS idx_study_plan_days_date ON study_plan_days(day_date);
