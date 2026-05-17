-- Default delivery provider: org-level preference for file uploads
-- NULL means built-in R2 storage (the default).

ALTER TABLE organizations
  ADD COLUMN IF NOT EXISTS default_delivery_provider text;
