-- Team invites for multi-user support

CREATE TABLE team_invites (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  email text NOT NULL,
  role org_role NOT NULL DEFAULT 'member',
  invited_by uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  token text UNIQUE NOT NULL,
  accepted_at timestamptz,
  expires_at timestamptz NOT NULL,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX idx_team_invites_org ON team_invites(org_id);
CREATE INDEX idx_team_invites_token ON team_invites(token);

ALTER TABLE team_invites ENABLE ROW LEVEL SECURITY;

CREATE POLICY team_invites_org ON team_invites FOR SELECT
  USING (org_id IN (SELECT user_org_ids()));

CREATE POLICY team_invites_manage ON team_invites FOR INSERT
  WITH CHECK (org_id IN (
    SELECT org_id FROM memberships WHERE user_id = auth.uid() AND role IN ('owner', 'admin')
  ));

CREATE POLICY team_invites_delete ON team_invites FOR DELETE
  USING (org_id IN (
    SELECT org_id FROM memberships WHERE user_id = auth.uid() AND role IN ('owner', 'admin')
  ));

-- Allow admin+ to add members to their org
CREATE POLICY memberships_invite ON memberships FOR INSERT
  WITH CHECK (org_id IN (
    SELECT org_id FROM memberships WHERE user_id = auth.uid() AND role IN ('owner', 'admin')
  ));

-- Allow admin+ to remove non-owner members from their org
CREATE POLICY memberships_remove ON memberships FOR DELETE
  USING (
    role != 'owner'
    AND org_id IN (
      SELECT org_id FROM memberships WHERE user_id = auth.uid() AND role IN ('owner', 'admin')
    )
  );
