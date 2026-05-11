-- AI Billing Migration: Monthly allowances baked into plans
-- Shifts from separate add-on purchase model to plan-included credits.

-- ============================================================
-- 1. Add monthly AI allowance to plan_entitlements
-- ============================================================

ALTER TABLE plan_entitlements
  ADD COLUMN IF NOT EXISTS ai_credits_monthly integer DEFAULT 0;

UPDATE plan_entitlements SET ai_credits_monthly = 0 WHERE plan_id = 'free';
UPDATE plan_entitlements SET ai_credits_monthly = 200 WHERE plan_id = 'pro';
UPDATE plan_entitlements SET ai_credits_monthly = 500 WHERE plan_id = 'studio';

-- ============================================================
-- 2. Add monthly cycle tracking to ai_addon
-- ============================================================

ALTER TABLE ai_addon
  ADD COLUMN IF NOT EXISTS monthly_credits_used integer DEFAULT 0,
  ADD COLUMN IF NOT EXISTS cycle_reset_at timestamptz;

-- ============================================================
-- 3. Cycle reset function (lazy — called before each consumption)
-- ============================================================

CREATE OR REPLACE FUNCTION check_ai_credit_cycle(p_org_id uuid)
RETURNS void AS $$
BEGIN
  UPDATE ai_addon
  SET monthly_credits_used = 0,
      cycle_reset_at = date_trunc('month', now()) + interval '1 month'
  WHERE org_id = p_org_id
    AND (cycle_reset_at IS NULL OR cycle_reset_at <= now());
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================
-- 4. New credit consumption: monthly allowance first, then purchased
-- ============================================================

CREATE OR REPLACE FUNCTION consume_ai_credits_v2(
  p_org_id uuid,
  p_amount integer,
  p_reason text,
  p_reference_id uuid DEFAULT NULL
) RETURNS jsonb AS $$
DECLARE
  v_addon ai_addon%ROWTYPE;
  v_monthly_allowance integer;
  v_monthly_remaining integer;
  v_from_monthly integer;
  v_from_purchased integer;
  v_plan_id text;
  v_trial_ends_at timestamptz;
BEGIN
  -- Reset cycle if needed
  PERFORM check_ai_credit_cycle(p_org_id);

  -- Get addon record (lock row)
  SELECT * INTO v_addon FROM ai_addon WHERE org_id = p_org_id FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'no_addon_record');
  END IF;

  -- Get org plan info
  SELECT plan_id, trial_ends_at INTO v_plan_id, v_trial_ends_at
  FROM organizations WHERE id = p_org_id;

  -- Determine monthly allowance (trial gets 50 one-time, not monthly)
  IF v_trial_ends_at > now() AND v_plan_id = 'free' THEN
    v_monthly_allowance := 50;
  ELSE
    SELECT COALESCE(ai_credits_monthly, 0) INTO v_monthly_allowance
    FROM plan_entitlements WHERE plan_id = v_plan_id
    LIMIT 1;
  END IF;

  IF v_monthly_allowance IS NULL THEN
    v_monthly_allowance := 0;
  END IF;

  -- Calculate remaining monthly credits
  v_monthly_remaining := GREATEST(0, v_monthly_allowance - COALESCE(v_addon.monthly_credits_used, 0));

  -- Consume from monthly first, then purchased
  v_from_monthly := LEAST(p_amount, v_monthly_remaining);
  v_from_purchased := p_amount - v_from_monthly;

  -- Check if we have enough purchased credits for the remainder
  IF v_from_purchased > 0 AND COALESCE(v_addon.credits_balance, 0) < v_from_purchased THEN
    RETURN jsonb_build_object('success', false, 'error', 'insufficient_credits');
  END IF;

  -- Deduct
  UPDATE ai_addon
  SET monthly_credits_used = COALESCE(monthly_credits_used, 0) + v_from_monthly,
      credits_balance = COALESCE(credits_balance, 0) - v_from_purchased,
      updated_at = now()
  WHERE org_id = p_org_id;

  -- Audit log
  INSERT INTO ai_credit_usage (org_id, credits_used, balance_after, reason, reference_id)
  VALUES (p_org_id, p_amount,
    (SELECT credits_balance FROM ai_addon WHERE org_id = p_org_id),
    p_reason, p_reference_id);

  RETURN jsonb_build_object(
    'success', true,
    'from_monthly', v_from_monthly,
    'from_purchased', v_from_purchased,
    'monthly_remaining', v_monthly_remaining - v_from_monthly,
    'purchased_remaining', (SELECT credits_balance FROM ai_addon WHERE org_id = p_org_id)
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================
-- 5. Ensure ai_addon records exist for paid orgs
-- ============================================================

INSERT INTO ai_addon (org_id, enabled, credits_balance, monthly_credits_used, cycle_reset_at)
SELECT o.id, true, 0, 0, date_trunc('month', now()) + interval '1 month'
FROM organizations o
WHERE o.plan_id IN ('pro', 'studio')
  AND NOT EXISTS (SELECT 1 FROM ai_addon a WHERE a.org_id = o.id)
ON CONFLICT DO NOTHING;

-- Mark existing addon records for paid orgs as enabled
UPDATE ai_addon
SET enabled = true
WHERE org_id IN (SELECT id FROM organizations WHERE plan_id IN ('pro', 'studio'))
  AND enabled = false;
