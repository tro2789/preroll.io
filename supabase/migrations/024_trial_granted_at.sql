-- Track whether a user has ever received a trial (prevents abuse via org delete/recreate)
ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS trial_granted_at timestamptz;

-- Backfill existing users who have an org with a trial
UPDATE user_profiles up
SET trial_granted_at = o.trial_ends_at - INTERVAL '7 days'
FROM memberships m
JOIN organizations o ON o.id = m.org_id
WHERE m.user_id = up.user_id
AND m.role = 'owner'
AND o.trial_ends_at IS NOT NULL
AND up.trial_granted_at IS NULL;

-- Update create_default_org trigger to mark trial as granted
CREATE OR REPLACE FUNCTION create_default_org()
RETURNS TRIGGER AS $$
DECLARE
  new_org_id uuid;
  user_name text;
  user_slug text;
  new_client_id uuid;
  new_show_id uuid;
  first_stage_id uuid;
  has_invite boolean;
BEGIN
  SELECT EXISTS (
    SELECT 1 FROM public.team_invites
    WHERE email = NEW.email
      AND accepted_at IS NULL
      AND expires_at > NOW()
  ) INTO has_invite;

  IF has_invite THEN
    RETURN NEW;
  END IF;

  user_name := COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1));
  user_slug := REPLACE(NEW.id::text, '-', '');

  INSERT INTO public.organizations (name, slug, trial_ends_at)
  VALUES (user_name || '''s Workspace', user_slug, NOW() + INTERVAL '7 days')
  RETURNING id INTO new_org_id;

  INSERT INTO public.memberships (org_id, user_id, role)
  VALUES (new_org_id, NEW.id, 'owner');

  UPDATE public.user_profiles SET trial_granted_at = NOW() WHERE user_id = NEW.id;

  INSERT INTO public.clients (org_id, user_id, name, notes, is_sample)
  VALUES (new_org_id, NEW.id, 'Sample Client', 'This is a sample client to help you explore PreRoll. Edit or delete it anytime.', true)
  RETURNING id INTO new_client_id;

  INSERT INTO public.shows (client_id, name, description)
  VALUES (new_client_id, 'My First Podcast', 'A sample show to see how PreRoll organizes episodes.')
  RETURNING id INTO new_show_id;

  INSERT INTO public.pipeline_stages (show_id, name, position, status_override) VALUES
    (new_show_id, 'Planning',  1, 'planning'),
    (new_show_id, 'Recording', 2, 'recording'),
    (new_show_id, 'Editing',   3, 'editing'),
    (new_show_id, 'Review',    4, 'review'),
    (new_show_id, 'Approved',  5, 'approved'),
    (new_show_id, 'Published', 6, 'published');

  SELECT id INTO first_stage_id FROM public.pipeline_stages
    WHERE show_id = new_show_id AND position = 1;

  INSERT INTO public.episodes (show_id, title, episode_number, stage_id, status, position)
  VALUES (new_show_id, 'Episode 1 — Getting Started', 1, first_stage_id, 'planning', 0);

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;
