ALTER TABLE subjects
ADD COLUMN IF NOT EXISTS is_optional BOOLEAN DEFAULT false;

-- Create an index for faster filtering of optional vs GS subjects
CREATE INDEX IF NOT EXISTS idx_subjects_is_optional ON subjects(is_optional);
