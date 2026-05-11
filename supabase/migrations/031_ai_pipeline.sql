-- AI Pipeline: Auto-transcribe + auto-generate on audio upload

-- ============================================================
-- 1. Pipeline job tracking
-- ============================================================

CREATE TABLE ai_pipeline_jobs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  episode_id uuid NOT NULL REFERENCES episodes(id) ON DELETE CASCADE,
  file_reference_id uuid REFERENCES file_references(id) ON DELETE SET NULL,
  trigger_source text NOT NULL, -- 'auto_upload', 'auto_webhook', 'manual'
  status text NOT NULL DEFAULT 'pending',
    -- pending, transcribing, generating, completed, failed, skipped, partial
  transcription_id uuid REFERENCES transcriptions(id) ON DELETE SET NULL,
  generation_ids uuid[] DEFAULT '{}',
  error_message text,
  skipped_reason text, -- 'no_credits', 'already_transcribed', 'not_audio', 'disabled'
  created_at timestamptz DEFAULT now(),
  completed_at timestamptz,
  updated_at timestamptz DEFAULT now()
);

CREATE TRIGGER ai_pipeline_jobs_updated_at BEFORE UPDATE ON ai_pipeline_jobs
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE INDEX idx_ai_pipeline_episode ON ai_pipeline_jobs(episode_id);
CREATE INDEX idx_ai_pipeline_org ON ai_pipeline_jobs(org_id);
CREATE INDEX idx_ai_pipeline_status ON ai_pipeline_jobs(status) WHERE status IN ('pending', 'transcribing', 'generating');

ALTER TABLE ai_pipeline_jobs ENABLE ROW LEVEL SECURITY;

CREATE POLICY ai_pipeline_jobs_select ON ai_pipeline_jobs FOR SELECT
  USING (org_id IN (SELECT user_org_ids()));

CREATE POLICY ai_pipeline_jobs_insert ON ai_pipeline_jobs FOR INSERT
  WITH CHECK (org_id IN (SELECT user_org_ids()));

CREATE POLICY ai_pipeline_jobs_update ON ai_pipeline_jobs FOR UPDATE
  USING (org_id IN (SELECT user_org_ids()));

-- Service role needs access too (for webhook/pipeline use)
CREATE POLICY ai_pipeline_jobs_service ON ai_pipeline_jobs FOR ALL
  USING (auth.role() = 'service_role');

-- ============================================================
-- 2. Per-show AI pipeline settings
-- ============================================================

ALTER TABLE shows
  ADD COLUMN IF NOT EXISTS ai_auto_transcribe boolean DEFAULT true,
  ADD COLUMN IF NOT EXISTS ai_auto_generate text[] DEFAULT ARRAY[
    'show_notes', 'description', 'title_suggestions',
    'social_twitter', 'social_linkedin', 'social_instagram'
  ];
