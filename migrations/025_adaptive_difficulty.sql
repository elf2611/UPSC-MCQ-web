ALTER TABLE user_statistics 
ADD COLUMN IF NOT EXISTS rolling_ability_score NUMERIC DEFAULT 1200.0; -- Default Elo is 1200

ALTER TABLE questions 
ADD COLUMN IF NOT EXISTS difficulty_rating NUMERIC DEFAULT 1200.0; -- Default Elo is 1200

-- Create an index to quickly select questions by difficulty
CREATE INDEX IF NOT EXISTS idx_questions_difficulty_rating ON questions(difficulty_rating);
CREATE INDEX IF NOT EXISTS idx_user_statistics_ability ON user_statistics(rolling_ability_score);
