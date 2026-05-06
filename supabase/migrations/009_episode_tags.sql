-- Tags (user-scoped)
CREATE TABLE tags (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  name text NOT NULL,
  color text NOT NULL DEFAULT '#6366f1',
  created_at timestamptz DEFAULT now()
);

-- Episode-tag junction
CREATE TABLE episode_tags (
  episode_id uuid REFERENCES episodes(id) ON DELETE CASCADE NOT NULL,
  tag_id uuid REFERENCES tags(id) ON DELETE CASCADE NOT NULL,
  PRIMARY KEY (episode_id, tag_id)
);

-- RLS
ALTER TABLE tags ENABLE ROW LEVEL SECURITY;
CREATE POLICY tags_owner ON tags FOR ALL USING (user_id = auth.uid());

ALTER TABLE episode_tags ENABLE ROW LEVEL SECURITY;
CREATE POLICY episode_tags_owner ON episode_tags FOR ALL
  USING (
    tag_id IN (SELECT id FROM tags WHERE user_id = auth.uid())
  );
