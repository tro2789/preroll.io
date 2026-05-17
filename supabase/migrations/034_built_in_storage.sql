-- Built-in Storage: R2-backed zero-config file storage for all orgs
-- Adds storage quota tracking and entitlements per plan tier.

-- ============================================================
-- 0. Add 'r2' to the integration_provider enum
-- ============================================================

ALTER TYPE integration_provider ADD VALUE IF NOT EXISTS 'r2';

-- ============================================================
-- 1. Track storage usage per org
-- ============================================================

ALTER TABLE organizations
  ADD COLUMN IF NOT EXISTS storage_used_bytes bigint DEFAULT 0;

-- ============================================================
-- 2. Add storage entitlements (limit_value in MB)
-- ============================================================

INSERT INTO plan_entitlements (plan_id, feature, enabled, limit_value)
VALUES
  ('free',   'storage', true, 10240),      -- 10 GB
  ('pro',    'storage', true, 512000),      -- 500 GB
  ('studio', 'storage', true, 2097152)      -- 2 TB
ON CONFLICT (plan_id, feature) DO UPDATE
  SET enabled = EXCLUDED.enabled,
      limit_value = EXCLUDED.limit_value;

-- ============================================================
-- 3. Atomic storage increment/decrement RPCs
-- ============================================================

CREATE OR REPLACE FUNCTION increment_storage_usage(p_org_id uuid, p_bytes bigint)
RETURNS bigint AS $$
DECLARE
  new_total bigint;
BEGIN
  UPDATE organizations
    SET storage_used_bytes = storage_used_bytes + p_bytes
    WHERE id = p_org_id
    RETURNING storage_used_bytes INTO new_total;
  RETURN new_total;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION decrement_storage_usage(p_org_id uuid, p_bytes bigint)
RETURNS bigint AS $$
DECLARE
  new_total bigint;
BEGIN
  UPDATE organizations
    SET storage_used_bytes = GREATEST(0, storage_used_bytes - p_bytes)
    WHERE id = p_org_id
    RETURNING storage_used_bytes INTO new_total;
  RETURN new_total;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================
-- 4. Recalculate storage from file_references (safety valve)
-- ============================================================

CREATE OR REPLACE FUNCTION recalculate_storage_usage(p_org_id uuid)
RETURNS bigint AS $$
DECLARE
  total bigint;
BEGIN
  SELECT COALESCE(SUM(file_size), 0) INTO total
    FROM file_references
    WHERE org_id = p_org_id
      AND provider = 'r2';

  UPDATE organizations
    SET storage_used_bytes = total
    WHERE id = p_org_id;

  RETURN total;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
