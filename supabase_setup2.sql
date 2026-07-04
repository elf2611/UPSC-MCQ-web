-- Add user_id to attempt_answers if missing
ALTER TABLE attempt_answers
  ADD COLUMN IF NOT EXISTS user_id UUID,
  ADD COLUMN IF NOT EXISTS created_at TIMESTAMP DEFAULT NOW();

-- Create unique constraint for user_statistics if missing
ALTER TABLE user_statistics 
  DROP CONSTRAINT IF EXISTS user_statistics_user_subject_unique;
  
ALTER TABLE user_statistics
  ADD CONSTRAINT user_statistics_user_subject_unique 
  UNIQUE (user_id, subject_id);

-- Create the upsert function
CREATE OR REPLACE FUNCTION upsert_user_statistics(
  p_user_id UUID,
  p_subject_id TEXT,
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
  ON CONFLICT (user_id, subject_id) 
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

-- Verify tables
SELECT 'test_attempts' as table_name, COUNT(*) FROM test_attempts
UNION ALL
SELECT 'attempt_answers', COUNT(*) FROM attempt_answers
UNION ALL
SELECT 'user_statistics', COUNT(*) FROM user_statistics
UNION ALL
SELECT 'questions', COUNT(*) FROM questions;
