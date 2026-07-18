-- Fix schema drift for processing_jobs
-- The job_type column is required by the API to differentiate between PDF chunks and current affairs processing.
ALTER TABLE processing_jobs ADD COLUMN IF NOT EXISTS job_type TEXT DEFAULT 'pdf_chunk';

-- Also ensure retry_count is present in case it was missed in earlier initializations
ALTER TABLE processing_jobs ADD COLUMN IF NOT EXISTS retry_count INTEGER DEFAULT 0;
