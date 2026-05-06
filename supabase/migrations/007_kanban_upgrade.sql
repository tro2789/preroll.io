-- Add position column to episodes for intra-column ordering
ALTER TABLE episodes ADD COLUMN position integer NOT NULL DEFAULT 0;

-- Backfill positions: assign sequential positions within each stage_id group,
-- ordered by episode_number then created_at (matching current display order)
WITH ranked AS (
  SELECT id,
         ROW_NUMBER() OVER (
           PARTITION BY stage_id
           ORDER BY episode_number ASC NULLS LAST, created_at ASC
         ) - 1 AS new_position
  FROM episodes
  WHERE stage_id IS NOT NULL
)
UPDATE episodes
SET position = ranked.new_position
FROM ranked
WHERE episodes.id = ranked.id;

-- Add status_override to pipeline_stages so custom stages can explicitly
-- declare which status enum value they map to (null = purely custom)
ALTER TABLE pipeline_stages ADD COLUMN status_override episode_status;

-- Backfill status_override for default stages that match enum values
UPDATE pipeline_stages
SET status_override = LOWER(name)::episode_status
WHERE LOWER(name) IN ('planning', 'recording', 'editing', 'review', 'approved', 'published');

-- Add wip_limit to pipeline_stages (null = no limit)
ALTER TABLE pipeline_stages ADD COLUMN wip_limit integer;

-- Index for efficient position-ordered queries within a stage
CREATE INDEX idx_episodes_stage_position ON episodes(stage_id, position);

-- RPC functions for atomic position shifts during reorder
CREATE OR REPLACE FUNCTION shift_episode_positions_down(
  p_stage_id uuid, p_from integer, p_to integer
) RETURNS void AS $$
BEGIN
  UPDATE episodes
  SET position = position + 1
  WHERE stage_id = p_stage_id AND position >= p_from AND position <= p_to;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION shift_episode_positions_up(
  p_stage_id uuid, p_from integer, p_to integer
) RETURNS void AS $$
BEGIN
  UPDATE episodes
  SET position = position - 1
  WHERE stage_id = p_stage_id AND position >= p_from AND position <= p_to;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
