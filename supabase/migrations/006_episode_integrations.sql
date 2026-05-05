-- Provider-agnostic episode delivery integrations
-- Replaces episodes.frameio_project_id / frameio_root_folder_id with a proper junction table

-- ============================================================
-- Episode integrations table (one delivery provider per episode)
-- ============================================================

CREATE TABLE episode_integrations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  episode_id uuid REFERENCES episodes(id) ON DELETE CASCADE NOT NULL,
  provider integration_provider NOT NULL,
  external_project_id text,
  external_folder_id text,
  external_view_url text,
  metadata jsonb DEFAULT '{}',
  created_at timestamptz DEFAULT now(),
  UNIQUE(episode_id, provider)
);

CREATE INDEX episode_integrations_episode_idx ON episode_integrations(episode_id);

-- ============================================================
-- RLS: producer owns via episodes → shows → clients chain
-- ============================================================

ALTER TABLE episode_integrations ENABLE ROW LEVEL SECURITY;

CREATE POLICY episode_integrations_owner ON episode_integrations FOR ALL
  USING (
    episode_id IN (
      SELECT e.id FROM episodes e
      JOIN shows s ON e.show_id = s.id
      JOIN clients c ON s.client_id = c.id
      WHERE c.user_id = auth.uid()
    )
  );

CREATE POLICY episode_integrations_client ON episode_integrations FOR SELECT
  USING (
    episode_id IN (
      SELECT e.id FROM episodes e
      JOIN shows s ON e.show_id = s.id
      JOIN clients c ON s.client_id = c.id
      WHERE c.client_user_id = auth.uid()
    )
  );

-- ============================================================
-- Migrate existing Frame.io data from episodes table
-- ============================================================

INSERT INTO episode_integrations (episode_id, provider, external_project_id, external_folder_id)
SELECT id, 'frame_io', frameio_project_id, frameio_root_folder_id
FROM episodes
WHERE frameio_project_id IS NOT NULL;

-- ============================================================
-- Drop old Frame.io-specific columns
-- ============================================================

ALTER TABLE episodes DROP COLUMN IF EXISTS frameio_project_id;
ALTER TABLE episodes DROP COLUMN IF EXISTS frameio_root_folder_id;
