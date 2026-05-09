-- Onboarding checklist: schema additions, RPC helpers, and sample data seeding

-- ============================================================
-- 1. Schema additions
-- ============================================================

ALTER TABLE clients ADD COLUMN is_sample boolean NOT NULL DEFAULT false;
ALTER TABLE organizations ADD COLUMN onboarding_dismissed_at timestamptz;

-- ============================================================
-- 2. RPC helpers for onboarding step detection
-- ============================================================

CREATE OR REPLACE FUNCTION onboarding_counts(p_org_id uuid)
RETURNS TABLE(real_shows int, real_episodes int, moved_episodes int) AS $$
  SELECT
    (SELECT count(*)::int FROM shows s JOIN clients c ON s.client_id = c.id
     WHERE c.org_id = p_org_id AND c.is_sample = false),
    (SELECT count(*)::int FROM episodes e JOIN shows s ON e.show_id = s.id
     JOIN clients c ON s.client_id = c.id
     WHERE c.org_id = p_org_id AND c.is_sample = false AND e.archived_at IS NULL),
    (SELECT count(*)::int FROM episodes e JOIN shows s ON e.show_id = s.id
     JOIN clients c ON s.client_id = c.id JOIN pipeline_stages ps ON e.stage_id = ps.id
     WHERE c.org_id = p_org_id AND c.is_sample = false AND ps.position > 1 AND e.archived_at IS NULL);
$$ LANGUAGE sql SECURITY DEFINER SET search_path = public;

-- ============================================================
-- 3. Update create_default_org trigger to seed sample data
-- ============================================================

CREATE OR REPLACE FUNCTION create_default_org()
RETURNS TRIGGER AS $$
DECLARE
  new_org_id uuid;
  user_name text;
  user_slug text;
  new_client_id uuid;
  new_show_id uuid;
  first_stage_id uuid;
BEGIN
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
