-- Ensure revision_queue exists (should exist from 004_gamification.sql)
ALTER TABLE revision_queue 
ADD COLUMN IF NOT EXISTS source TEXT DEFAULT 'manual' CHECK (source IN ('manual', 'auto_wrong_twice', 'auto_low_confidence', 'auto_stale')),
ADD COLUMN IF NOT EXISTS weakness_score NUMERIC DEFAULT 0,
ADD COLUMN IF NOT EXISTS last_surfaced_at TIMESTAMPTZ DEFAULT NOW();

-- Index for quickly querying auto-added vs manual
CREATE INDEX IF NOT EXISTS idx_revision_queue_source ON revision_queue(source);
