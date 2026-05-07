CREATE TABLE distribution_connections (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  show_id uuid REFERENCES shows(id) ON DELETE CASCADE NOT NULL,
  provider text NOT NULL,
  api_key_enc text NOT NULL,
  external_show_id text NOT NULL,
  external_show_name text,
  metadata jsonb,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(show_id, provider)
);

ALTER TABLE distribution_connections ENABLE ROW LEVEL SECURITY;

CREATE POLICY distribution_connections_producer ON distribution_connections FOR ALL
  USING (show_id IN (
    SELECT s.id FROM shows s
    JOIN clients c ON s.client_id = c.id
    WHERE c.user_id = auth.uid()
  ));

ALTER TABLE episodes ADD COLUMN IF NOT EXISTS distribution_status text;
ALTER TABLE episodes ADD COLUMN IF NOT EXISTS distribution_external_id text;
ALTER TABLE episodes ADD COLUMN IF NOT EXISTS distribution_published_at timestamptz;
ALTER TABLE episodes ADD COLUMN IF NOT EXISTS distribution_metadata jsonb;
