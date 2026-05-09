-- Skip auto-org creation for users who have a pending team invite.
-- When an admin invites someone, createUser() fires this trigger before
-- the user accepts the invite. Without this check, the invited user gets
-- a spurious personal org where they're "owner".

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
  -- Check for a pending team invite for this email
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

  -- Seed sample client
  INSERT INTO public.clients (org_id, user_id, name, notes, is_sample)
  VALUES (new_org_id, NEW.id, 'Sample Client', 'This is a sample client to help you explore PreRoll. Edit or delete it anytime.', true)
  RETURNING id INTO new_client_id;

  -- Seed sample show
  INSERT INTO public.shows (client_id, name, description)
  VALUES (new_client_id, 'My First Podcast', 'A sample show to see how PreRoll organizes episodes.')
  RETURNING id INTO new_show_id;

  -- Seed default pipeline stages
  INSERT INTO public.pipeline_stages (show_id, name, position, status_override) VALUES
    (new_show_id, 'Planning',  1, 'planning'),
    (new_show_id, 'Recording', 2, 'recording'),
    (new_show_id, 'Editing',   3, 'editing'),
    (new_show_id, 'Review',    4, 'review'),
    (new_show_id, 'Approved',  5, 'approved'),
    (new_show_id, 'Published', 6, 'published');

  -- Get the first stage for the sample episode
  SELECT id INTO first_stage_id FROM public.pipeline_stages
    WHERE show_id = new_show_id AND position = 1;

  -- Seed sample episode
  INSERT INTO public.episodes (show_id, title, episode_number, stage_id, status, position)
  VALUES (new_show_id, 'Episode 1 — Getting Started', 1, first_stage_id, 'planning', 0);

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;
