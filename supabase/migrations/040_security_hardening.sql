-- ============================================================
-- 040: Security & efficiency hardening (from codebase audit)
--   1. Idempotency constraint for inbound webhook events
--   2. Foreign-key / analytics indexes on hot query paths
--   3. Append-only audit log for privileged super-admin actions
-- ============================================================

-- 1. Webhook idempotency ---------------------------------------------------
-- Turn concurrent / replayed deliveries into a single processed event. NULL
-- external_id rows (events without an id) remain un-deduped, matching the
-- application's insert path.
CREATE UNIQUE INDEX IF NOT EXISTS webhook_events_dedup_idx
  ON webhook_events (provider, event_type, external_id)
  WHERE external_id IS NOT NULL;

-- 2. Hot-path indexes ------------------------------------------------------
-- Activity feed (per-show, newest first).
CREATE INDEX IF NOT EXISTS idx_activity_log_show_created
  ON activity_log (show_id, created_at DESC);

-- Per-show episode board / counts.
CREATE INDEX IF NOT EXISTS idx_episodes_show ON episodes (show_id);

-- Deliverable lookups by parent show / episode.
CREATE INDEX IF NOT EXISTS idx_deliverables_show ON deliverables (show_id);
CREATE INDEX IF NOT EXISTS idx_deliverables_episode ON deliverables (episode_id);

-- Default (org-wide) analytics views filter by org_id + date.
CREATE INDEX IF NOT EXISTS idx_episode_analytics_org_date
  ON episode_analytics (org_id, date);
CREATE INDEX IF NOT EXISTS idx_show_analytics_org_date
  ON show_analytics (org_id, date);

-- 3. Admin audit log -------------------------------------------------------
CREATE TABLE IF NOT EXISTS admin_audit_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  actor_email text,
  action text NOT NULL,
  target_type text,
  target_id text,
  metadata jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_admin_audit_log_created
  ON admin_audit_log (created_at DESC);

-- Service-role only (mirrors super_admins): never readable/writable via the
-- anon/authenticated session client.
ALTER TABLE admin_audit_log ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'admin_audit_log' AND policyname = 'admin_audit_log_service_only'
  ) THEN
    CREATE POLICY admin_audit_log_service_only ON admin_audit_log FOR ALL USING (false);
  END IF;
END $$;
