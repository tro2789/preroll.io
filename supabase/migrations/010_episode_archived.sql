-- Add archived_at column to episodes for archiving published episodes
ALTER TABLE episodes ADD COLUMN archived_at timestamptz;

-- Index for filtering out archived episodes efficiently
CREATE INDEX idx_episodes_archived ON episodes(archived_at) WHERE archived_at IS NULL;
