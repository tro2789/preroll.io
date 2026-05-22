-- Allow distribution_connections to store client OAuth tokens for YouTube
-- When a client connects their YouTube channel directly, tokens are stored per-show
-- rather than in the org-level user_integrations table.

ALTER TABLE distribution_connections
  ADD COLUMN IF NOT EXISTS access_token_enc text,
  ADD COLUMN IF NOT EXISTS refresh_token_enc text,
  ADD COLUMN IF NOT EXISTS token_expires_at timestamptz,
  ADD COLUMN IF NOT EXISTS connected_by text DEFAULT 'producer';

-- Make api_key_enc nullable (not needed for client OAuth YouTube connections)
ALTER TABLE distribution_connections ALTER COLUMN api_key_enc DROP NOT NULL;
