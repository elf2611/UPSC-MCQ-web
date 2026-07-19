-- Safely add missing columns to staged_questions to resolve schema drift

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 
    FROM information_schema.columns 
    WHERE table_name = 'staged_questions' AND column_name = 'job_id'
  ) THEN
    ALTER TABLE staged_questions ADD COLUMN job_id UUID REFERENCES processing_jobs(id) ON DELETE SET NULL;
  END IF;

  IF NOT EXISTS (
    SELECT 1 
    FROM information_schema.columns 
    WHERE table_name = 'staged_questions' AND column_name = 'source'
  ) THEN
    ALTER TABLE staged_questions ADD COLUMN source TEXT DEFAULT 'pdf_chunk';
  END IF;

  -- Ensure subtopic and article_date exist just in case they are missing on some environments
  IF NOT EXISTS (
    SELECT 1 
    FROM information_schema.columns 
    WHERE table_name = 'staged_questions' AND column_name = 'subtopic'
  ) THEN
    ALTER TABLE staged_questions ADD COLUMN subtopic TEXT;
  END IF;

  IF NOT EXISTS (
    SELECT 1 
    FROM information_schema.columns 
    WHERE table_name = 'staged_questions' AND column_name = 'article_date'
  ) THEN
    ALTER TABLE staged_questions ADD COLUMN article_date DATE;
  END IF;
END $$;
