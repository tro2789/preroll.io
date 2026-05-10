-- AI Add-on: Transcription + Generation
-- Adds tables for AI credits, transcription jobs, and generation history.

-- ============================================================
-- 1. AI add-on configuration per organization
-- ============================================================

CREATE TABLE ai_addon (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE UNIQUE,
  enabled boolean NOT NULL DEFAULT false,
  credits_balance integer NOT NULL DEFAULT 0,
  deepgram_api_key_enc text,
  anthropic_api_key_enc text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TRIGGER ai_addon_updated_at BEFORE UPDATE ON ai_addon
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

ALTER TABLE ai_addon ENABLE ROW LEVEL SECURITY;

CREATE POLICY ai_addon_select ON ai_addon FOR SELECT
  USING (org_id IN (SELECT user_org_ids()));

CREATE POLICY ai_addon_insert ON ai_addon FOR INSERT
  WITH CHECK (org_id IN (SELECT user_org_ids()));

CREATE POLICY ai_addon_update ON ai_addon FOR UPDATE
  USING (org_id IN (SELECT user_org_ids()));

-- ============================================================
-- 2. Credit purchase history
-- ============================================================

CREATE TABLE ai_credit_purchases (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  stripe_payment_intent_id text UNIQUE,
  credits_purchased integer NOT NULL,
  amount_cents integer NOT NULL,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE ai_credit_purchases ENABLE ROW LEVEL SECURITY;

CREATE POLICY ai_credit_purchases_select ON ai_credit_purchases FOR SELECT
  USING (org_id IN (SELECT user_org_ids()));

-- ============================================================
-- 3. Transcriptions
-- ============================================================

CREATE TYPE transcription_status AS ENUM (
  'pending',
  'processing',
  'completed',
  'failed'
);

CREATE TABLE transcriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  episode_id uuid NOT NULL REFERENCES episodes(id) ON DELETE CASCADE,
  status transcription_status NOT NULL DEFAULT 'pending',
  source_type text NOT NULL,
  source_ref text NOT NULL,
  audio_duration_seconds numeric,
  full_text text,
  segments jsonb,
  speaker_count integer,
  word_count integer,
  provider text NOT NULL DEFAULT 'deepgram',
  external_request_id text,
  credits_consumed integer NOT NULL DEFAULT 0,
  error_message text,
  submitted_at timestamptz DEFAULT now(),
  completed_at timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TRIGGER transcriptions_updated_at BEFORE UPDATE ON transcriptions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE INDEX idx_transcriptions_episode ON transcriptions(episode_id);
CREATE INDEX idx_transcriptions_org ON transcriptions(org_id);
CREATE INDEX idx_transcriptions_pending ON transcriptions(status) WHERE status = 'pending';

ALTER TABLE transcriptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY transcriptions_select ON transcriptions FOR SELECT
  USING (org_id IN (SELECT user_org_ids()));

CREATE POLICY transcriptions_insert ON transcriptions FOR INSERT
  WITH CHECK (org_id IN (SELECT user_org_ids()));

CREATE POLICY transcriptions_update ON transcriptions FOR UPDATE
  USING (org_id IN (SELECT user_org_ids()));

-- ============================================================
-- 4. AI generations
-- ============================================================

CREATE TYPE ai_generation_type AS ENUM (
  'show_notes',
  'description',
  'social_twitter',
  'social_linkedin',
  'social_instagram',
  'title_suggestions'
);

CREATE TABLE ai_generations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  episode_id uuid NOT NULL REFERENCES episodes(id) ON DELETE CASCADE,
  transcription_id uuid REFERENCES transcriptions(id) ON DELETE SET NULL,
  generation_type ai_generation_type NOT NULL,
  model text NOT NULL DEFAULT 'claude-haiku-4-5-20251001',
  result text,
  input_tokens integer,
  output_tokens integer,
  credits_consumed integer NOT NULL DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX idx_ai_generations_episode ON ai_generations(episode_id);
CREATE INDEX idx_ai_generations_org ON ai_generations(org_id);

ALTER TABLE ai_generations ENABLE ROW LEVEL SECURITY;

CREATE POLICY ai_generations_select ON ai_generations FOR SELECT
  USING (org_id IN (SELECT user_org_ids()));

CREATE POLICY ai_generations_insert ON ai_generations FOR INSERT
  WITH CHECK (org_id IN (SELECT user_org_ids()));

-- ============================================================
-- 5. Credit usage log (append-only audit trail)
-- ============================================================

CREATE TABLE ai_credit_usage (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  credits_used integer NOT NULL,
  balance_after integer NOT NULL,
  reason text NOT NULL,
  reference_id uuid,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX idx_ai_credit_usage_org ON ai_credit_usage(org_id, created_at DESC);

ALTER TABLE ai_credit_usage ENABLE ROW LEVEL SECURITY;

CREATE POLICY ai_credit_usage_select ON ai_credit_usage FOR SELECT
  USING (org_id IN (SELECT user_org_ids()));

-- ============================================================
-- 6. Atomic credit operations (RPC)
-- ============================================================

CREATE OR REPLACE FUNCTION consume_ai_credits(
  p_org_id uuid,
  p_amount integer,
  p_reason text,
  p_reference_id uuid
) RETURNS jsonb AS $$
DECLARE
  v_balance integer;
BEGIN
  UPDATE ai_addon
  SET credits_balance = credits_balance - p_amount,
      updated_at = now()
  WHERE org_id = p_org_id
    AND credits_balance >= p_amount
  RETURNING credits_balance INTO v_balance;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'balance_after', 0);
  END IF;

  INSERT INTO ai_credit_usage (org_id, credits_used, balance_after, reason, reference_id)
  VALUES (p_org_id, p_amount, v_balance, p_reason, p_reference_id);

  RETURN jsonb_build_object('success', true, 'balance_after', v_balance);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION refund_ai_credits(
  p_org_id uuid,
  p_amount integer,
  p_reason text,
  p_reference_id uuid
) RETURNS void AS $$
DECLARE
  v_balance integer;
BEGIN
  UPDATE ai_addon
  SET credits_balance = credits_balance + p_amount,
      updated_at = now()
  WHERE org_id = p_org_id
  RETURNING credits_balance INTO v_balance;

  IF FOUND THEN
    INSERT INTO ai_credit_usage (org_id, credits_used, balance_after, reason, reference_id)
    VALUES (p_org_id, -p_amount, v_balance, p_reason, p_reference_id);
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
