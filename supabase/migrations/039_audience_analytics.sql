-- ============================================================
-- Audience Analytics: tables, entitlements, RLS
-- ============================================================

-- 1. analytics_connections (show-level, mirrors distribution_connections)
CREATE TABLE analytics_connections (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  show_id uuid NOT NULL REFERENCES shows(id) ON DELETE CASCADE,
  org_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  provider text NOT NULL CHECK (provider IN ('apple', 'spotify_csv', 'transistor', 'castopod')),
  credentials_enc text,
  external_show_id text,
  last_synced_at timestamptz,
  sync_status text NOT NULL DEFAULT 'active' CHECK (sync_status IN ('active', 'error', 'paused')),
  sync_error text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(show_id, provider)
);

ALTER TABLE analytics_connections ENABLE ROW LEVEL SECURITY;

CREATE POLICY "analytics_connections_org"
  ON analytics_connections FOR ALL
  USING (org_id IN (SELECT om.org_id FROM memberships om WHERE om.user_id = auth.uid()));

-- 2. episode_analytics (daily snapshots per episode per source)
CREATE TABLE episode_analytics (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  episode_id uuid NOT NULL REFERENCES episodes(id) ON DELETE CASCADE,
  show_id uuid NOT NULL REFERENCES shows(id) ON DELETE CASCADE,
  org_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  provider text NOT NULL,
  date date NOT NULL,
  downloads integer NOT NULL DEFAULT 0,
  plays integer,
  listeners integer,
  avg_listen_duration_seconds integer,
  completion_rate numeric,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(episode_id, provider, date)
);

ALTER TABLE episode_analytics ENABLE ROW LEVEL SECURITY;

CREATE POLICY "episode_analytics_org"
  ON episode_analytics FOR ALL
  USING (org_id IN (SELECT om.org_id FROM memberships om WHERE om.user_id = auth.uid()));

CREATE INDEX idx_episode_analytics_show_date ON episode_analytics (show_id, date);
CREATE INDEX idx_episode_analytics_episode ON episode_analytics (episode_id, date);

-- 3. show_analytics (daily show-level rollups)
CREATE TABLE show_analytics (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  show_id uuid NOT NULL REFERENCES shows(id) ON DELETE CASCADE,
  org_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  provider text NOT NULL,
  date date NOT NULL,
  followers integer,
  new_followers integer,
  total_downloads integer NOT NULL DEFAULT 0,
  total_plays integer,
  top_countries jsonb,
  top_devices jsonb,
  top_apps jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(show_id, provider, date)
);

ALTER TABLE show_analytics ENABLE ROW LEVEL SECURITY;

CREATE POLICY "show_analytics_org"
  ON show_analytics FOR ALL
  USING (org_id IN (SELECT om.org_id FROM memberships om WHERE om.user_id = auth.uid()));

CREATE INDEX idx_show_analytics_show_date ON show_analytics (show_id, date);

-- 4. Add analytics_milestones jsonb to shows
ALTER TABLE shows ADD COLUMN IF NOT EXISTS analytics_milestones jsonb;

-- 5. Add portal_analytics_enabled to organizations
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS portal_analytics_enabled boolean NOT NULL DEFAULT false;

-- 6. Add analytics entitlement for studio plan
INSERT INTO plan_entitlements (plan_id, feature, limit_value, enabled) VALUES
  ('free',   'analytics', NULL, false),
  ('pro',    'analytics', NULL, false),
  ('studio', 'analytics', NULL, true)
ON CONFLICT (plan_id, feature) DO NOTHING;

-- Service-role bypasses RLS by default in Supabase, so no additional
-- permissive policies are needed for n8n ingest calls.
