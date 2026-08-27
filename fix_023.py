with open("migrations/023_study_plans.sql", "r") as f:
    c = f.read()

c = c.replace("""CREATE POLICY "Users can manage their own study plans"
  ON study_plans
  FOR ALL
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());""", "")

c = c.replace("""CREATE POLICY "Users can manage their own study plan days"
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
  );""", "")

with open("migrations/023_study_plans.sql", "w") as f:
    f.write(c)
