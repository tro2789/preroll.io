-- Enum types
CREATE TYPE episode_status AS ENUM ('planning', 'recording', 'editing', 'review', 'approved', 'published');
CREATE TYPE approval_status AS ENUM ('pending', 'approved', 'revision_requested');
CREATE TYPE asset_type AS ENUM ('cover_art', 'intro', 'outro', 'music_bed', 'thumbnail', 'show_notes', 'clip', 'other');

-- Clients
CREATE TABLE clients (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  name text NOT NULL,
  company text,
  email text,
  phone text,
  notes text,
  service_terms text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Meeting notes
CREATE TABLE meeting_notes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid REFERENCES clients(id) ON DELETE CASCADE NOT NULL,
  title text,
  content text NOT NULL,
  meeting_date date NOT NULL DEFAULT CURRENT_DATE,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Shows
CREATE TABLE shows (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid REFERENCES clients(id) ON DELETE CASCADE NOT NULL,
  name text NOT NULL,
  description text,
  format text,
  schedule text,
  transistor_show_id text,
  cover_art_url text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Show pipeline stages (customizable per show)
CREATE TABLE pipeline_stages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  show_id uuid REFERENCES shows(id) ON DELETE CASCADE NOT NULL,
  name text NOT NULL,
  position integer NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- Episodes
CREATE TABLE episodes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  show_id uuid REFERENCES shows(id) ON DELETE CASCADE NOT NULL,
  title text NOT NULL,
  episode_number integer,
  description text,
  stage_id uuid REFERENCES pipeline_stages(id) ON DELETE SET NULL,
  status episode_status DEFAULT 'planning',
  scheduled_publish_date date,
  published_at timestamptz,
  frame_io_url text,
  transistor_episode_id text,
  notes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Assets (metadata; actual files in R2)
CREATE TABLE assets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  show_id uuid REFERENCES shows(id) ON DELETE CASCADE NOT NULL,
  episode_id uuid REFERENCES episodes(id) ON DELETE CASCADE,
  asset_type asset_type NOT NULL DEFAULT 'other',
  name text NOT NULL,
  file_key text NOT NULL,
  file_size bigint,
  mime_type text,
  created_at timestamptz DEFAULT now()
);

-- Triggers for updated_at
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER clients_updated_at BEFORE UPDATE ON clients FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER meeting_notes_updated_at BEFORE UPDATE ON meeting_notes FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER shows_updated_at BEFORE UPDATE ON shows FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER episodes_updated_at BEFORE UPDATE ON episodes FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- RLS Policies
ALTER TABLE clients ENABLE ROW LEVEL SECURITY;
CREATE POLICY clients_owner ON clients FOR ALL USING (user_id = auth.uid());

ALTER TABLE meeting_notes ENABLE ROW LEVEL SECURITY;
CREATE POLICY meeting_notes_owner ON meeting_notes FOR ALL
  USING (client_id IN (SELECT id FROM clients WHERE user_id = auth.uid()));

ALTER TABLE shows ENABLE ROW LEVEL SECURITY;
CREATE POLICY shows_owner ON shows FOR ALL
  USING (client_id IN (SELECT id FROM clients WHERE user_id = auth.uid()));

ALTER TABLE pipeline_stages ENABLE ROW LEVEL SECURITY;
CREATE POLICY pipeline_stages_owner ON pipeline_stages FOR ALL
  USING (show_id IN (SELECT s.id FROM shows s JOIN clients c ON s.client_id = c.id WHERE c.user_id = auth.uid()));

ALTER TABLE episodes ENABLE ROW LEVEL SECURITY;
CREATE POLICY episodes_owner ON episodes FOR ALL
  USING (show_id IN (SELECT s.id FROM shows s JOIN clients c ON s.client_id = c.id WHERE c.user_id = auth.uid()));

ALTER TABLE assets ENABLE ROW LEVEL SECURITY;
CREATE POLICY assets_owner ON assets FOR ALL
  USING (show_id IN (SELECT s.id FROM shows s JOIN clients c ON s.client_id = c.id WHERE c.user_id = auth.uid()));
