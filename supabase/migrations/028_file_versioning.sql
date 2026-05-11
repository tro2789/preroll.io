-- File Versioning
-- Adds version groups, stacking columns, and auto-reshare RPC
-- so producers can upload new versions of a file and have linked
-- deliverables update automatically.

-- ============================================================
-- 1. Add versioning columns to file_references
-- ============================================================

ALTER TABLE file_references
  ADD COLUMN version_group_id uuid DEFAULT gen_random_uuid(),
  ADD COLUMN version_number integer DEFAULT 1,
  ADD COLUMN is_latest boolean DEFAULT true;

CREATE INDEX idx_file_references_version_group ON file_references(version_group_id);

-- ============================================================
-- 2. Add versioning columns to deliverables
-- ============================================================

ALTER TABLE deliverables
  ADD COLUMN version_group_id uuid,
  ADD COLUMN file_reference_id uuid REFERENCES file_references(id);

CREATE INDEX idx_deliverables_version_group ON deliverables(version_group_id);

-- ============================================================
-- 3. RPC: add a file to an existing version group
-- ============================================================

CREATE OR REPLACE FUNCTION add_file_to_version_group(
  p_file_id uuid,
  p_target_group_id uuid
) RETURNS jsonb AS $$
DECLARE
  v_max_version integer;
  v_result jsonb;
BEGIN
  -- Get current max version in the target group
  SELECT COALESCE(MAX(version_number), 0) INTO v_max_version
  FROM file_references WHERE version_group_id = p_target_group_id;

  -- Mark all existing files in the group as not latest
  UPDATE file_references
  SET is_latest = false
  WHERE version_group_id = p_target_group_id;

  -- Move the file into the group and mark as latest
  UPDATE file_references
  SET version_group_id = p_target_group_id,
      version_number = v_max_version + 1,
      is_latest = true,
      updated_at = now()
  WHERE id = p_file_id;

  -- Auto-reshare: update any deliverables linked to this version group
  UPDATE deliverables
  SET file_url = (SELECT external_url FROM file_references WHERE id = p_file_id),
      file_key = NULL,
      updated_at = now(),
      status = 'pending'
  WHERE version_group_id = p_target_group_id
    AND status != 'revision_requested';

  SELECT jsonb_build_object(
    'version_number', v_max_version + 1,
    'group_size', v_max_version + 1
  ) INTO v_result;

  RETURN v_result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
