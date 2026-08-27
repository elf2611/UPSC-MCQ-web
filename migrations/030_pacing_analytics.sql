CREATE TABLE IF NOT EXISTS subject_pacing_benchmarks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  subject_id UUID REFERENCES subjects(id) ON DELETE CASCADE,
  score_band TEXT NOT NULL CHECK (score_band IN ('top_10_percent', 'average', 'bottom_10_percent', 'global_average')),
  avg_time_per_question NUMERIC NOT NULL,
  last_updated TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(subject_id, score_band)
);

ALTER TABLE subject_pacing_benchmarks ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS idx_pacing_subject_id ON subject_pacing_benchmarks(subject_id);

CREATE OR REPLACE FUNCTION refresh_pacing_benchmarks()
RETURNS void AS $$
BEGIN
  -- Insert or update global average per subject
  INSERT INTO subject_pacing_benchmarks (subject_id, score_band, avg_time_per_question, last_updated)
  SELECT 
    q.subject_id, 
    'global_average' as score_band,
    AVG(aa.time_spent_seconds) as avg_time,
    NOW()
  FROM attempt_answers aa
  JOIN questions q ON aa.question_id = q.id
  WHERE aa.created_at >= NOW() - INTERVAL '30 days'
    AND aa.time_spent_seconds > 0
    AND aa.time_spent_seconds < 300 -- Ignore outliers (left tab open)
  GROUP BY q.subject_id
  ON CONFLICT (subject_id, score_band) DO UPDATE 
  SET avg_time_per_question = EXCLUDED.avg_time_per_question, last_updated = EXCLUDED.last_updated;

  -- Update 'top_10_percent' (approximated as correct answers only for simplicity right now)
  INSERT INTO subject_pacing_benchmarks (subject_id, score_band, avg_time_per_question, last_updated)
  SELECT 
    q.subject_id, 
    'top_10_percent' as score_band,
    AVG(aa.time_spent_seconds) as avg_time,
    NOW()
  FROM attempt_answers aa
  JOIN questions q ON aa.question_id = q.id
  WHERE aa.created_at >= NOW() - INTERVAL '30 days'
    AND aa.is_correct = true
    AND aa.time_spent_seconds > 0
    AND aa.time_spent_seconds < 300
  GROUP BY q.subject_id
  ON CONFLICT (subject_id, score_band) DO UPDATE 
  SET avg_time_per_question = EXCLUDED.avg_time_per_question, last_updated = EXCLUDED.last_updated;

END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
