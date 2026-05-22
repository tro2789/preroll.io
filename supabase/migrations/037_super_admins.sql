-- Super admins: platform-level admin access for cloud service management.
-- Separate from org memberships — super admins can see all orgs/users.

CREATE TABLE super_admins (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE super_admins ENABLE ROW LEVEL SECURITY;

CREATE POLICY super_admins_service_only ON super_admins
  FOR ALL USING (false);

CREATE OR REPLACE FUNCTION is_super_admin(uid uuid)
RETURNS boolean AS $$
  SELECT EXISTS (SELECT 1 FROM super_admins WHERE user_id = uid)
$$ LANGUAGE sql SECURITY DEFINER STABLE;

INSERT INTO super_admins (user_id)
SELECT id FROM auth.users WHERE email = 'trevor@trevorohare.com'
ON CONFLICT DO NOTHING;
