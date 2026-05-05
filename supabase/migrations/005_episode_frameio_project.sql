-- Episode-level Frame.io project tracking + workspace_id on integrations
-- Also relaxes file_references constraint to allow untagged files

-- ============================================================
-- Add Frame.io project columns to episodes
-- ============================================================

ALTER TABLE episodes ADD COLUMN frameio_project_id text;
ALTER TABLE episodes ADD COLUMN frameio_root_folder_id text;

-- ============================================================
-- Add workspace_id to user_integrations
-- ============================================================

ALTER TABLE user_integrations ADD COLUMN workspace_id text;

-- ============================================================
-- Relax file_references CHECK constraint
-- Allow rows where both episode_id and deliverable_id are NULL
-- (files in a Frame.io project before being tagged as deliverables)
-- ============================================================

ALTER TABLE file_references DROP CONSTRAINT file_references_check;
