-- Phase 3: Integrations Schema
-- user_integrations (OAuth connections), file_references (external file links), webhook_events (audit)

-- ============================================================
-- Provider enum
-- ============================================================

CREATE TYPE integration_provider AS ENUM ('frame_io', 'google_drive', 'vimeo', 'dropbox');

-- ============================================================
-- User integrations (OAuth credentials per provider)
-- ============================================================

CREATE TABLE user_integrations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  provider integration_provider NOT NULL,
  access_token_enc text NOT NULL,
  refresh_token_enc text,
  token_expires_at timestamptz,
  account_id text,
  account_name text,
  account_email text,
  account_avatar_url text,
  scopes text,
  raw_metadata jsonb,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(user_id, provider)
);

CREATE TRIGGER user_integrations_updated_at BEFORE UPDATE ON user_integrations
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ============================================================
-- File references (external files linked to episodes/deliverables)
-- ============================================================

CREATE TABLE file_references (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  provider integration_provider NOT NULL,
  external_id text NOT NULL,
  external_url text,
  name text NOT NULL,
  thumbnail_url text,
  mime_type text,
  file_size bigint,
  duration_seconds numeric,
  provider_metadata jsonb,
  episode_id uuid REFERENCES episodes(id) ON DELETE CASCADE,
  deliverable_id uuid REFERENCES deliverables(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  CHECK (episode_id IS NOT NULL OR deliverable_id IS NOT NULL)
);

CREATE TRIGGER file_references_updated_at BEFORE UPDATE ON file_references
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE INDEX file_references_episode_idx ON file_references(episode_id) WHERE episode_id IS NOT NULL;
CREATE INDEX file_references_deliverable_idx ON file_references(deliverable_id) WHERE deliverable_id IS NOT NULL;
CREATE INDEX file_references_external_idx ON file_references(provider, external_id);

-- ============================================================
-- Webhook events (audit + idempotency)
-- ============================================================

CREATE TABLE webhook_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  provider integration_provider NOT NULL,
  event_type text NOT NULL,
  external_id text,
  payload jsonb NOT NULL,
  processed_at timestamptz,
  error text,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX webhook_events_provider_idx ON webhook_events(provider, event_type, created_at DESC);

-- ============================================================
-- RLS Policies
-- ============================================================

ALTER TABLE user_integrations ENABLE ROW LEVEL SECURITY;
CREATE POLICY user_integrations_owner ON user_integrations FOR ALL
  USING (user_id = auth.uid());

ALTER TABLE file_references ENABLE ROW LEVEL SECURITY;
CREATE POLICY file_references_owner ON file_references FOR ALL
  USING (user_id = auth.uid());

CREATE POLICY file_references_client ON file_references FOR SELECT
  USING (
    episode_id IN (
      SELECT e.id FROM episodes e
      JOIN shows s ON e.show_id = s.id
      JOIN clients c ON s.client_id = c.id
      WHERE c.client_user_id = auth.uid()
    )
    OR deliverable_id IN (
      SELECT d.id FROM deliverables d
      JOIN shows s ON d.show_id = s.id
      JOIN clients c ON s.client_id = c.id
      WHERE c.client_user_id = auth.uid()
    )
  );

ALTER TABLE webhook_events ENABLE ROW LEVEL SECURITY;
