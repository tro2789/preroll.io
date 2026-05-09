-- Track when an episode entered its current pipeline stage (for auto-archive)
ALTER TABLE episodes ADD COLUMN stage_entered_at timestamptz DEFAULT now();

-- Backfill: use updated_at as best approximation for existing episodes
UPDATE episodes SET stage_entered_at = updated_at WHERE stage_entered_at IS NULL;
