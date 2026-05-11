-- Fix auto-reshare to also update file_reference_id on deliverables
-- so the media route resolves the correct (latest) version.

CREATE OR REPLACE FUNCTION add_file_to_version_group(
  p_file_id uuid,
  p_target_group_id uuid
) RETURNS jsonb AS $$
DECLARE
  v_max_version integer;
  v_result jsonb;
BEGIN
  SELECT COALESCE(MAX(version_number), 0) INTO v_max_version
  FROM file_references WHERE version_group_id = p_target_group_id;

  UPDATE file_references
  SET is_latest = false
  WHERE version_group_id = p_target_group_id;

  UPDATE file_references
  SET version_group_id = p_target_group_id,
      version_number = v_max_version + 1,
      is_latest = true,
      updated_at = now()
  WHERE id = p_file_id;

  UPDATE deliverables
  SET file_url = (SELECT external_url FROM file_references WHERE id = p_file_id),
      file_key = NULL,
      file_reference_id = p_file_id,
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
