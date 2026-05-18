-- Storage add-on: per-TB monthly add-on for Pro/Studio users
ALTER TABLE organizations
  ADD COLUMN IF NOT EXISTS storage_addon_tbs integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS storage_grace_started_at timestamptz;
