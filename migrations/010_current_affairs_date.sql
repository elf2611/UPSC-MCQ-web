-- Add article_date to questions table
ALTER TABLE questions ADD COLUMN IF NOT EXISTS article_date DATE;

-- Add article_date to staged_questions table
ALTER TABLE staged_questions ADD COLUMN IF NOT EXISTS article_date DATE;

-- Index on article_date for questions to speed up grouping and filtering for Current Affairs page
CREATE INDEX IF NOT EXISTS idx_questions_article_date ON questions(article_date);
