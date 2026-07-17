-- Indexes for performance
CREATE UNIQUE INDEX IF NOT EXISTS user_stat_unique_topic 
  ON user_statistics (user_id, subject_id, topic_id) 
  WHERE topic_id IS NOT NULL;
  
CREATE UNIQUE INDEX IF NOT EXISTS user_stat_unique_subject 
  ON user_statistics (user_id, subject_id) 
  WHERE topic_id IS NULL;

-- Upsert function
CREATE OR REPLACE FUNCTION upsert_user_statistics(
  p_user_id TEXT,
  p_subject_id UUID,
  p_attempted INTEGER,
  p_correct INTEGER
) RETURNS void AS $$
BEGIN
  INSERT INTO user_statistics 
    (user_id, subject_id, total_attempted, 
     total_correct, accuracy_percent)
  VALUES (
    p_user_id, p_subject_id, p_attempted, p_correct,
    CASE WHEN p_attempted > 0 
    THEN ROUND((p_correct::numeric / p_attempted) * 100, 2)
    ELSE 0 END
  )
  ON CONFLICT (user_id, subject_id) WHERE topic_id IS NULL
  DO UPDATE SET
    total_attempted = user_statistics.total_attempted + p_attempted,
    total_correct = user_statistics.total_correct + p_correct,
    accuracy_percent = CASE 
      WHEN (user_statistics.total_attempted + p_attempted) > 0
      THEN ROUND(
        ((user_statistics.total_correct + p_correct)::numeric / 
         (user_statistics.total_attempted + p_attempted)) * 100, 2)
      ELSE 0 END,
    updated_at = NOW();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION increment_xp(
  user_id TEXT,
  xp_amount INTEGER
) RETURNS void AS $$
BEGIN
  UPDATE profiles
  SET xp = xp + xp_amount
  WHERE id = user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
