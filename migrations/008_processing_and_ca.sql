CREATE TABLE IF NOT EXISTS processing_jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  upload_id UUID,
  source_file TEXT NOT NULL,
  chunk_start_page INTEGER,
  chunk_end_page INTEGER,
  status TEXT DEFAULT 'waiting',
  status_message TEXT,
  error_message TEXT,
  job_type TEXT DEFAULT 'pdf_chunk',
  questions_generated INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Safely add job_type column if table already existed without it
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 
    FROM information_schema.columns 
    WHERE table_name = 'processing_jobs' AND column_name = 'job_type'
  ) THEN
    ALTER TABLE processing_jobs ADD COLUMN job_type TEXT DEFAULT 'pdf_chunk';
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS staged_questions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id UUID REFERENCES processing_jobs(id) ON DELETE SET NULL,
  question_hash TEXT UNIQUE,
  question_text TEXT NOT NULL,
  option_a TEXT NOT NULL,
  option_b TEXT NOT NULL,
  option_c TEXT NOT NULL,
  option_d TEXT NOT NULL,
  correct_option TEXT NOT NULL,
  explanation TEXT,
  why_a_wrong TEXT,
  why_b_wrong TEXT,
  why_c_wrong TEXT,
  why_d_wrong TEXT,
  elimination_tip TEXT,
  subject TEXT,
  topic TEXT,
  difficulty TEXT,
  year INTEGER,
  source TEXT DEFAULT 'pdf_chunk',
  status TEXT DEFAULT 'pending',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 
    FROM information_schema.columns 
    WHERE table_name = 'daily_current_affairs' AND column_name = 'processed'
  ) THEN
    ALTER TABLE daily_current_affairs ADD COLUMN processed BOOLEAN DEFAULT false;
  END IF;
END $$;
