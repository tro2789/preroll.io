-- Organizations, memberships, billing, and entitlements
-- Shifts data ownership from user_id to org_id

-- ============================================================
-- 1. Core tables
-- ============================================================

CREATE TYPE org_role AS ENUM ('owner', 'admin', 'member');

CREATE TABLE organizations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  slug text UNIQUE NOT NULL,
  stripe_customer_id text UNIQUE,
  stripe_account_id text UNIQUE,  -- future: Stripe Connect for producer invoicing
  plan_id text NOT NULL DEFAULT 'free',
  plan_status text NOT NULL DEFAULT 'active',
  trial_ends_at timestamptz,
  self_hosted boolean NOT NULL DEFAULT false,
  license_key text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TRIGGER organizations_updated_at BEFORE UPDATE ON organizations
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TABLE memberships (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role org_role NOT NULL DEFAULT 'owner',
  created_at timestamptz DEFAULT now(),
  UNIQUE(org_id, user_id)
);

CREATE INDEX idx_memberships_user ON memberships(user_id);
CREATE INDEX idx_memberships_org ON memberships(org_id);

-- ============================================================
-- 2. Billing tables
-- ============================================================

CREATE TABLE subscriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE UNIQUE,
  stripe_subscription_id text UNIQUE NOT NULL,
  stripe_price_id text NOT NULL,
  status text NOT NULL,
  current_period_start timestamptz NOT NULL,
  current_period_end timestamptz NOT NULL,
  cancel_at_period_end boolean NOT NULL DEFAULT false,
  canceled_at timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TRIGGER subscriptions_updated_at BEFORE UPDATE ON subscriptions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TABLE stripe_events (
  id text PRIMARY KEY,
  type text NOT NULL,
  processed_at timestamptz DEFAULT now()
);

-- ============================================================
-- 3. Entitlements
-- ============================================================

CREATE TABLE plan_entitlements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  plan_id text NOT NULL,
  feature text NOT NULL,
  limit_value integer,
  enabled boolean NOT NULL DEFAULT true,
  UNIQUE(plan_id, feature)
);

INSERT INTO plan_entitlements (plan_id, feature, limit_value, enabled) VALUES
  ('free', 'max_clients', 1, true),
  ('free', 'max_shows', 1, true),
  ('free', 'integrations', NULL, false),
  ('free', 'webhooks', NULL, false),
  ('free', 'api_keys', NULL, false),
  ('free', 'mcp', NULL, false),
  ('free', 'templates', NULL, false),
  ('free', 'client_portal', NULL, true),

  ('pro', 'max_clients', NULL, true),
  ('pro', 'max_shows', NULL, true),
  ('pro', 'integrations', NULL, true),
  ('pro', 'webhooks', NULL, true),
  ('pro', 'api_keys', NULL, true),
  ('pro', 'mcp', NULL, true),
  ('pro', 'templates', NULL, true),
  ('pro', 'client_portal', NULL, true),

  ('studio', 'max_clients', NULL, true),
  ('studio', 'max_shows', NULL, true),
  ('studio', 'integrations', NULL, true),
  ('studio', 'webhooks', NULL, true),
  ('studio', 'api_keys', NULL, true),
  ('studio', 'mcp', NULL, true),
  ('studio', 'templates', NULL, true),
  ('studio', 'client_portal', NULL, true),
  ('studio', 'multi_user', NULL, true),
  ('studio', 'white_label', NULL, true);

-- ============================================================
-- 4. Add org_id to producer-owned tables
-- ============================================================

ALTER TABLE clients ADD COLUMN org_id uuid REFERENCES organizations(id) ON DELETE CASCADE;
ALTER TABLE tags ADD COLUMN org_id uuid REFERENCES organizations(id) ON DELETE CASCADE;
ALTER TABLE user_integrations ADD COLUMN org_id uuid REFERENCES organizations(id) ON DELETE CASCADE;
ALTER TABLE file_references ADD COLUMN org_id uuid REFERENCES organizations(id) ON DELETE CASCADE;
ALTER TABLE webhook_endpoints ADD COLUMN org_id uuid REFERENCES organizations(id) ON DELETE CASCADE;
ALTER TABLE api_keys ADD COLUMN org_id uuid REFERENCES organizations(id) ON DELETE CASCADE;

-- ============================================================
-- 5. Backfill: create orgs for existing users, populate org_id
-- ============================================================

INSERT INTO organizations (id, name, slug)
SELECT
  gen_random_uuid(),
  COALESCE(raw_user_meta_data->>'full_name', split_part(email, '@', 1)) || '''s Workspace',
  REPLACE(id::text, '-', '')
FROM auth.users;

INSERT INTO memberships (org_id, user_id, role)
SELECT o.id, u.id, 'owner'
FROM auth.users u
JOIN organizations o ON o.slug = REPLACE(u.id::text, '-', '');

UPDATE clients c SET org_id = m.org_id
FROM memberships m WHERE m.user_id = c.user_id AND m.role = 'owner';

UPDATE tags t SET org_id = m.org_id
FROM memberships m WHERE m.user_id = t.user_id AND m.role = 'owner';

UPDATE user_integrations ui SET org_id = m.org_id
FROM memberships m WHERE m.user_id = ui.user_id AND m.role = 'owner';

UPDATE file_references fr SET org_id = m.org_id
FROM memberships m WHERE m.user_id = fr.user_id AND m.role = 'owner';

UPDATE webhook_endpoints we SET org_id = m.org_id
FROM memberships m WHERE m.user_id = we.user_id AND m.role = 'owner';

UPDATE api_keys ak SET org_id = m.org_id
FROM memberships m WHERE m.user_id = ak.user_id AND m.role = 'owner';

-- Make org_id NOT NULL now that backfill is done
ALTER TABLE clients ALTER COLUMN org_id SET NOT NULL;
ALTER TABLE tags ALTER COLUMN org_id SET NOT NULL;
ALTER TABLE user_integrations ALTER COLUMN org_id SET NOT NULL;
ALTER TABLE file_references ALTER COLUMN org_id SET NOT NULL;
ALTER TABLE webhook_endpoints ALTER COLUMN org_id SET NOT NULL;
ALTER TABLE api_keys ALTER COLUMN org_id SET NOT NULL;

-- Update unique constraint on user_integrations
ALTER TABLE user_integrations DROP CONSTRAINT user_integrations_user_id_provider_key;
ALTER TABLE user_integrations ADD CONSTRAINT user_integrations_org_provider_key UNIQUE(org_id, provider);

-- Indexes
CREATE INDEX idx_clients_org ON clients(org_id);
CREATE INDEX idx_tags_org ON tags(org_id);
CREATE INDEX idx_user_integrations_org ON user_integrations(org_id);
CREATE INDEX idx_webhook_endpoints_org ON webhook_endpoints(org_id);
CREATE INDEX idx_api_keys_org ON api_keys(org_id);

-- ============================================================
-- 6. RLS helper function
-- ============================================================

CREATE OR REPLACE FUNCTION user_org_ids()
RETURNS SETOF uuid AS $$
  SELECT org_id FROM memberships WHERE user_id = auth.uid()
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- ============================================================
-- 7. Rewrite producer-side RLS policies
-- ============================================================

-- clients
DROP POLICY clients_owner ON clients;
CREATE POLICY clients_org ON clients FOR ALL
  USING (org_id IN (SELECT user_org_ids()));

-- meeting_notes (unchanged path but rewrite for consistency)
DROP POLICY meeting_notes_owner ON meeting_notes;
CREATE POLICY meeting_notes_org ON meeting_notes FOR ALL
  USING (client_id IN (SELECT id FROM clients WHERE org_id IN (SELECT user_org_ids())));

-- shows
DROP POLICY shows_owner ON shows;
CREATE POLICY shows_org ON shows FOR ALL
  USING (client_id IN (SELECT id FROM clients WHERE org_id IN (SELECT user_org_ids())));

-- pipeline_stages
DROP POLICY pipeline_stages_owner ON pipeline_stages;
CREATE POLICY pipeline_stages_org ON pipeline_stages FOR ALL
  USING (show_id IN (
    SELECT s.id FROM shows s JOIN clients c ON s.client_id = c.id
    WHERE c.org_id IN (SELECT user_org_ids())
  ));

-- episodes
DROP POLICY episodes_owner ON episodes;
CREATE POLICY episodes_org ON episodes FOR ALL
  USING (show_id IN (
    SELECT s.id FROM shows s JOIN clients c ON s.client_id = c.id
    WHERE c.org_id IN (SELECT user_org_ids())
  ));

-- assets
DROP POLICY assets_owner ON assets;
CREATE POLICY assets_org ON assets FOR ALL
  USING (show_id IN (
    SELECT s.id FROM shows s JOIN clients c ON s.client_id = c.id
    WHERE c.org_id IN (SELECT user_org_ids())
  ));

-- deliverables (producer)
DROP POLICY deliverables_producer ON deliverables;
CREATE POLICY deliverables_org ON deliverables FOR ALL
  USING (show_id IN (
    SELECT s.id FROM shows s JOIN clients c ON s.client_id = c.id
    WHERE c.org_id IN (SELECT user_org_ids())
  ));

-- activity_log (producer)
DROP POLICY activity_log_producer ON activity_log;
CREATE POLICY activity_log_org ON activity_log FOR ALL
  USING (show_id IN (
    SELECT s.id FROM shows s JOIN clients c ON s.client_id = c.id
    WHERE c.org_id IN (SELECT user_org_ids())
  ));

-- tags
DROP POLICY tags_owner ON tags;
CREATE POLICY tags_org ON tags FOR ALL
  USING (org_id IN (SELECT user_org_ids()));

-- episode_tags
DROP POLICY episode_tags_owner ON episode_tags;
CREATE POLICY episode_tags_org ON episode_tags FOR ALL
  USING (tag_id IN (SELECT id FROM tags WHERE org_id IN (SELECT user_org_ids())));

-- user_integrations
DROP POLICY user_integrations_owner ON user_integrations;
CREATE POLICY user_integrations_org ON user_integrations FOR ALL
  USING (org_id IN (SELECT user_org_ids()));

-- file_references (producer)
DROP POLICY file_references_owner ON file_references;
CREATE POLICY file_references_org ON file_references FOR ALL
  USING (org_id IN (SELECT user_org_ids()));

-- episode_integrations (producer)
DROP POLICY episode_integrations_owner ON episode_integrations;
CREATE POLICY episode_integrations_org ON episode_integrations FOR ALL
  USING (episode_id IN (
    SELECT e.id FROM episodes e
    JOIN shows s ON e.show_id = s.id
    JOIN clients c ON s.client_id = c.id
    WHERE c.org_id IN (SELECT user_org_ids())
  ));

-- distribution_connections
DROP POLICY distribution_connections_producer ON distribution_connections;
CREATE POLICY distribution_connections_org ON distribution_connections FOR ALL
  USING (show_id IN (
    SELECT s.id FROM shows s JOIN clients c ON s.client_id = c.id
    WHERE c.org_id IN (SELECT user_org_ids())
  ));

-- review_comments (producer)
DROP POLICY review_comments_producer ON review_comments;
CREATE POLICY review_comments_org ON review_comments FOR ALL
  USING (deliverable_id IN (
    SELECT d.id FROM deliverables d
    JOIN shows s ON d.show_id = s.id
    JOIN clients c ON s.client_id = c.id
    WHERE c.org_id IN (SELECT user_org_ids())
  ));

-- webhook_endpoints
DROP POLICY "Users manage own webhook endpoints" ON webhook_endpoints;
CREATE POLICY webhook_endpoints_org ON webhook_endpoints FOR ALL
  USING (org_id IN (SELECT user_org_ids()))
  WITH CHECK (org_id IN (SELECT user_org_ids()));

-- webhook_deliveries
DROP POLICY "Users view own webhook deliveries" ON webhook_deliveries;
CREATE POLICY webhook_deliveries_org ON webhook_deliveries FOR SELECT
  USING (endpoint_id IN (
    SELECT id FROM webhook_endpoints WHERE org_id IN (SELECT user_org_ids())
  ));

-- api_keys
DROP POLICY "Users manage own API keys" ON api_keys;
CREATE POLICY api_keys_org ON api_keys FOR ALL
  USING (org_id IN (SELECT user_org_ids()))
  WITH CHECK (org_id IN (SELECT user_org_ids()));

-- ============================================================
-- 8. RLS on new tables
-- ============================================================

ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;
CREATE POLICY orgs_member ON organizations FOR SELECT
  USING (id IN (SELECT user_org_ids()));
CREATE POLICY orgs_owner ON organizations FOR UPDATE
  USING (id IN (SELECT org_id FROM memberships WHERE user_id = auth.uid() AND role = 'owner'));

ALTER TABLE memberships ENABLE ROW LEVEL SECURITY;
CREATE POLICY memberships_member ON memberships FOR SELECT
  USING (org_id IN (SELECT user_org_ids()));

ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;
CREATE POLICY subscriptions_org ON subscriptions FOR SELECT
  USING (org_id IN (SELECT user_org_ids()));

ALTER TABLE plan_entitlements ENABLE ROW LEVEL SECURITY;
CREATE POLICY plan_entitlements_read ON plan_entitlements FOR SELECT USING (true);

ALTER TABLE stripe_events ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- 9. Auto-create org for new users
-- ============================================================

CREATE OR REPLACE FUNCTION create_default_org()
RETURNS TRIGGER AS $$
DECLARE
  new_org_id uuid;
  user_name text;
  user_slug text;
BEGIN
  user_name := COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1));
  user_slug := REPLACE(NEW.id::text, '-', '');

  INSERT INTO organizations (name, slug)
  VALUES (user_name || '''s Workspace', user_slug)
  RETURNING id INTO new_org_id;

  INSERT INTO memberships (org_id, user_id, role)
  VALUES (new_org_id, NEW.id, 'owner');

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION create_default_org();

-- ============================================================
-- 10. Update webhook_endpoints index to use org_id
-- ============================================================

DROP INDEX IF EXISTS idx_webhook_endpoints_user;
CREATE INDEX idx_webhook_endpoints_org_active ON webhook_endpoints(org_id) WHERE is_active = true;
