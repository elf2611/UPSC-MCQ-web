CREATE TABLE IF NOT EXISTS cohorts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  target_exam_year INTEGER,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS cohort_memberships (
  user_id TEXT NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  cohort_id UUID NOT NULL REFERENCES cohorts(id) ON DELETE CASCADE,
  joined_at TIMESTAMPTZ DEFAULT NOW(),
  leaderboard_opt_in BOOLEAN DEFAULT true,
  PRIMARY KEY (user_id, cohort_id)
);

CREATE TABLE IF NOT EXISTS cohort_leaderboards (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cohort_id UUID NOT NULL REFERENCES cohorts(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  week_start_date DATE NOT NULL,
  questions_attempted INTEGER DEFAULT 0,
  accuracy_percent NUMERIC DEFAULT 0,
  xp_earned INTEGER DEFAULT 0,
  rank_position INTEGER,
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (cohort_id, user_id, week_start_date)
);

ALTER TABLE cohorts ENABLE ROW LEVEL SECURITY;
ALTER TABLE cohort_memberships ENABLE ROW LEVEL SECURITY;
ALTER TABLE cohort_leaderboards ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS idx_leaderboards_cohort_week ON cohort_leaderboards(cohort_id, week_start_date);

-- Insert a default cohort for new users
INSERT INTO cohorts (id, name, target_exam_year) 
VALUES ('c0000000-0000-0000-0000-000000000001', 'UPSC 2026 Target Batch', 2026)
ON CONFLICT DO NOTHING;

CREATE OR REPLACE FUNCTION refresh_weekly_leaderboards()
RETURNS void AS $$
DECLARE
  current_week_start DATE := date_trunc('week', CURRENT_DATE)::DATE;
BEGIN
  -- Upsert leaderboard stats for the current week for all opted-in cohort members
  INSERT INTO cohort_leaderboards (cohort_id, user_id, week_start_date, questions_attempted, accuracy_percent, xp_earned, updated_at)
  SELECT 
    cm.cohort_id,
    cm.user_id,
    current_week_start,
    COUNT(aa.id) as questions_attempted,
    CASE WHEN COUNT(aa.id) > 0 THEN (SUM(CASE WHEN aa.is_correct THEN 1 ELSE 0 END)::NUMERIC / COUNT(aa.id)) * 100 ELSE 0 END as accuracy_percent,
    SUM(CASE WHEN aa.is_correct THEN 10 ELSE 2 END) as xp_earned,
    NOW()
  FROM cohort_memberships cm
  JOIN attempt_answers aa ON aa.user_id = cm.user_id
  WHERE cm.leaderboard_opt_in = true 
    AND aa.created_at >= current_week_start
  GROUP BY cm.cohort_id, cm.user_id
  ON CONFLICT (cohort_id, user_id, week_start_date) DO UPDATE 
  SET 
    questions_attempted = EXCLUDED.questions_attempted,
    accuracy_percent = EXCLUDED.accuracy_percent,
    xp_earned = EXCLUDED.xp_earned,
    updated_at = EXCLUDED.updated_at;

  -- Update rank positions using a window function
  WITH ranked AS (
    SELECT id, RANK() OVER (PARTITION BY cohort_id, week_start_date ORDER BY xp_earned DESC, accuracy_percent DESC) as rnk
    FROM cohort_leaderboards
    WHERE week_start_date = current_week_start
  )
  UPDATE cohort_leaderboards cl
  SET rank_position = r.rnk
  FROM ranked r
  WHERE cl.id = r.id;

END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
