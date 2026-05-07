CREATE TABLE review_comments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  deliverable_id uuid REFERENCES deliverables(id) ON DELETE CASCADE NOT NULL,
  file_reference_id uuid REFERENCES file_references(id) ON DELETE SET NULL,
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  author_name text NOT NULL,
  text text NOT NULL,
  timestamp_secs double precision,
  external_id text,
  synced_at timestamptz,
  is_external boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX idx_review_comments_deliverable ON review_comments(deliverable_id);
CREATE UNIQUE INDEX idx_review_comments_external ON review_comments(external_id) WHERE external_id IS NOT NULL;

ALTER TABLE review_comments ENABLE ROW LEVEL SECURITY;

CREATE POLICY review_comments_producer ON review_comments FOR ALL
  USING (deliverable_id IN (
    SELECT d.id FROM deliverables d
    JOIN shows s ON d.show_id = s.id
    JOIN clients c ON s.client_id = c.id
    WHERE c.user_id = auth.uid()
  ));

CREATE POLICY review_comments_client_read ON review_comments FOR SELECT
  USING (deliverable_id IN (
    SELECT d.id FROM deliverables d
    JOIN shows s ON d.show_id = s.id
    JOIN clients c ON s.client_id = c.id
    WHERE c.client_user_id = auth.uid()
  ));

CREATE POLICY review_comments_client_insert ON review_comments FOR INSERT
  WITH CHECK (deliverable_id IN (
    SELECT d.id FROM deliverables d
    JOIN shows s ON d.show_id = s.id
    JOIN clients c ON s.client_id = c.id
    WHERE c.client_user_id = auth.uid()
  ) AND user_id = auth.uid());
