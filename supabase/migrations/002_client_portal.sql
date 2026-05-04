-- Phase 2: Client Portal Schema
-- New columns on clients, new tables: deliverables, activity_log
-- RLS policies for client portal access

-- ============================================================
-- New columns on clients table
-- ============================================================

ALTER TABLE clients ADD COLUMN client_user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL;
ALTER TABLE clients ADD COLUMN invite_code text UNIQUE;
ALTER TABLE clients ADD COLUMN invite_sent_at timestamptz;
ALTER TABLE clients ADD COLUMN onboarded_at timestamptz;

-- ============================================================
-- Deliverables table
-- ============================================================

CREATE TYPE deliverable_status AS ENUM ('pending', 'approved', 'revision_requested');
CREATE TYPE deliverable_type AS ENUM (
  'rough_cut', 'final_cut', 'thumbnail', 'show_notes',
  'cover_art', 'intro', 'outro', 'social_clip', 'other'
);

CREATE TABLE deliverables (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  show_id uuid REFERENCES shows(id) ON DELETE CASCADE NOT NULL,
  episode_id uuid REFERENCES episodes(id) ON DELETE CASCADE,
  type deliverable_type NOT NULL DEFAULT 'other',
  title text NOT NULL,
  description text,
  file_url text,
  file_key text,
  status deliverable_status DEFAULT 'pending',
  reviewer_notes text,
  reviewed_at timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TRIGGER deliverables_updated_at BEFORE UPDATE ON deliverables
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ============================================================
-- Activity log table
-- ============================================================

CREATE TABLE activity_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  show_id uuid REFERENCES shows(id) ON DELETE CASCADE NOT NULL,
  episode_id uuid REFERENCES episodes(id) ON DELETE CASCADE,
  action text NOT NULL,
  description text NOT NULL,
  metadata jsonb,
  created_at timestamptz DEFAULT now()
);

-- ============================================================
-- RLS: Deliverables
-- ============================================================

ALTER TABLE deliverables ENABLE ROW LEVEL SECURITY;

CREATE POLICY deliverables_producer ON deliverables FOR ALL
  USING (show_id IN (SELECT s.id FROM shows s JOIN clients c ON s.client_id = c.id WHERE c.user_id = auth.uid()));

CREATE POLICY deliverables_client ON deliverables FOR SELECT
  USING (show_id IN (SELECT s.id FROM shows s JOIN clients c ON s.client_id = c.id WHERE c.client_user_id = auth.uid()));

CREATE POLICY deliverables_client_review ON deliverables FOR UPDATE
  USING (show_id IN (SELECT s.id FROM shows s JOIN clients c ON s.client_id = c.id WHERE c.client_user_id = auth.uid()))
  WITH CHECK (show_id IN (SELECT s.id FROM shows s JOIN clients c ON s.client_id = c.id WHERE c.client_user_id = auth.uid()));

-- ============================================================
-- RLS: Activity log
-- ============================================================

ALTER TABLE activity_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY activity_log_producer ON activity_log FOR ALL
  USING (show_id IN (SELECT s.id FROM shows s JOIN clients c ON s.client_id = c.id WHERE c.user_id = auth.uid()));

CREATE POLICY activity_log_client ON activity_log FOR SELECT
  USING (show_id IN (SELECT s.id FROM shows s JOIN clients c ON s.client_id = c.id WHERE c.client_user_id = auth.uid()));

-- ============================================================
-- RLS: Client portal access to existing tables
-- ============================================================

-- Clients: client can read and update their own record
CREATE POLICY clients_self ON clients FOR SELECT
  USING (client_user_id = auth.uid());

CREATE POLICY clients_self_update ON clients FOR UPDATE
  USING (client_user_id = auth.uid())
  WITH CHECK (client_user_id = auth.uid());

-- Shows: client can read their own shows
CREATE POLICY shows_client ON shows FOR SELECT
  USING (client_id IN (SELECT id FROM clients WHERE client_user_id = auth.uid()));

-- Episodes: client can read episodes for their shows
CREATE POLICY episodes_client ON episodes FOR SELECT
  USING (show_id IN (SELECT s.id FROM shows s JOIN clients c ON s.client_id = c.id WHERE c.client_user_id = auth.uid()));

-- Pipeline stages: client can read
CREATE POLICY pipeline_stages_client ON pipeline_stages FOR SELECT
  USING (show_id IN (SELECT s.id FROM shows s JOIN clients c ON s.client_id = c.id WHERE c.client_user_id = auth.uid()));

-- Assets: client can read show assets
CREATE POLICY assets_client ON assets FOR SELECT
  USING (show_id IN (SELECT s.id FROM shows s JOIN clients c ON s.client_id = c.id WHERE c.client_user_id = auth.uid()));
