-- Fix: refund_ai_credits was adding all refunds to credits_balance (purchased)
-- instead of returning them to the monthly pool first.

CREATE OR REPLACE FUNCTION refund_ai_credits(
  p_org_id uuid,
  p_amount integer,
  p_reason text,
  p_reference_id uuid
) RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_addon ai_addon%ROWTYPE;
  v_to_monthly integer;
  v_to_purchased integer;
  v_balance integer;
BEGIN
  SELECT * INTO v_addon FROM ai_addon WHERE org_id = p_org_id FOR UPDATE;

  IF NOT FOUND THEN
    RETURN;
  END IF;

  -- Refund to monthly first (reverse of consumption order),
  -- but only up to what was actually used from monthly
  v_to_monthly := LEAST(p_amount, COALESCE(v_addon.monthly_credits_used, 0));
  v_to_purchased := p_amount - v_to_monthly;

  UPDATE ai_addon
  SET monthly_credits_used = COALESCE(monthly_credits_used, 0) - v_to_monthly,
      credits_balance = COALESCE(credits_balance, 0) + v_to_purchased,
      updated_at = now()
  WHERE org_id = p_org_id
  RETURNING credits_balance INTO v_balance;

  INSERT INTO ai_credit_usage (org_id, credits_used, balance_after, reason, reference_id)
  VALUES (p_org_id, -p_amount, v_balance, p_reason, p_reference_id);
END;
$$;
