-- Welcome card: track when client dismisses the welcome card
ALTER TABLE clients
  ADD COLUMN portal_welcome_dismissed_at timestamptz;

-- Deliverable downloads: org-level default (true = allow)
ALTER TABLE organizations
  ADD COLUMN allow_client_downloads boolean NOT NULL DEFAULT true;

-- Deliverable downloads: show-level override (null = inherit from org)
ALTER TABLE shows
  ADD COLUMN allow_client_downloads boolean;

-- Producer notes on deliverables
ALTER TABLE deliverables
  ADD COLUMN producer_notes text;
