-- Fix schema drift for daily_current_affairs

-- 1. Add missing processed column required by current-affairs/generate-questions/route.ts
ALTER TABLE daily_current_affairs ADD COLUMN IF NOT EXISTS processed BOOLEAN DEFAULT false;

-- 2. Add UNIQUE constraint to source_url
-- Required to prevent race conditions during scraping in current-affairs/fetch-articles/route.ts
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'daily_current_affairs_source_url_key'
  ) THEN
    ALTER TABLE daily_current_affairs ADD CONSTRAINT daily_current_affairs_source_url_key UNIQUE (source_url);
  END IF;
END $$;

-- 3. Add index on processed to speed up the generator cron which queries: eq('processed', false)
CREATE INDEX IF NOT EXISTS idx_daily_current_affairs_processed ON daily_current_affairs(processed) WHERE processed = false;
