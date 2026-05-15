-- AI Chat: In-app assistant with tool use

-- ============================================================
-- 1. Chat sessions
-- ============================================================

CREATE TABLE ai_chat_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title text,
  context_type text, -- 'episode', 'show', 'client', 'general'
  context_id uuid,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TRIGGER ai_chat_sessions_updated_at BEFORE UPDATE ON ai_chat_sessions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE INDEX idx_ai_chat_sessions_org ON ai_chat_sessions(org_id, user_id);
CREATE INDEX idx_ai_chat_sessions_context ON ai_chat_sessions(context_type, context_id);

ALTER TABLE ai_chat_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY ai_chat_sessions_select ON ai_chat_sessions FOR SELECT
  USING (org_id IN (SELECT user_org_ids()));

CREATE POLICY ai_chat_sessions_insert ON ai_chat_sessions FOR INSERT
  WITH CHECK (org_id IN (SELECT user_org_ids()));

CREATE POLICY ai_chat_sessions_update ON ai_chat_sessions FOR UPDATE
  USING (org_id IN (SELECT user_org_ids()));

CREATE POLICY ai_chat_sessions_delete ON ai_chat_sessions FOR DELETE
  USING (org_id IN (SELECT user_org_ids()));

CREATE POLICY ai_chat_sessions_service ON ai_chat_sessions FOR ALL
  USING (auth.role() = 'service_role');

-- ============================================================
-- 2. Chat messages
-- ============================================================

CREATE TABLE ai_chat_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id uuid NOT NULL REFERENCES ai_chat_sessions(id) ON DELETE CASCADE,
  role text NOT NULL, -- 'user', 'assistant'
  content text NOT NULL DEFAULT '',
  tool_calls jsonb,
  tool_results jsonb,
  tokens_used integer,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX idx_ai_chat_messages_session ON ai_chat_messages(session_id, created_at);

ALTER TABLE ai_chat_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY ai_chat_messages_select ON ai_chat_messages FOR SELECT
  USING (session_id IN (
    SELECT id FROM ai_chat_sessions WHERE org_id IN (SELECT user_org_ids())
  ));

CREATE POLICY ai_chat_messages_insert ON ai_chat_messages FOR INSERT
  WITH CHECK (session_id IN (
    SELECT id FROM ai_chat_sessions WHERE org_id IN (SELECT user_org_ids())
  ));

CREATE POLICY ai_chat_messages_service ON ai_chat_messages FOR ALL
  USING (auth.role() = 'service_role');

-- ============================================================
-- 3. Chat actions (audit trail for write operations)
-- ============================================================

CREATE TABLE ai_chat_actions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id uuid NOT NULL REFERENCES ai_chat_sessions(id) ON DELETE CASCADE,
  message_id uuid REFERENCES ai_chat_messages(id) ON DELETE SET NULL,
  org_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  action_type text NOT NULL,
  entity_type text,
  entity_id uuid,
  action_data jsonb,
  status text NOT NULL DEFAULT 'pending', -- 'pending', 'confirmed', 'executed', 'cancelled'
  created_at timestamptz DEFAULT now()
);

CREATE INDEX idx_ai_chat_actions_session ON ai_chat_actions(session_id);
CREATE INDEX idx_ai_chat_actions_org ON ai_chat_actions(org_id);

ALTER TABLE ai_chat_actions ENABLE ROW LEVEL SECURITY;

CREATE POLICY ai_chat_actions_select ON ai_chat_actions FOR SELECT
  USING (org_id IN (SELECT user_org_ids()));

CREATE POLICY ai_chat_actions_insert ON ai_chat_actions FOR INSERT
  WITH CHECK (org_id IN (SELECT user_org_ids()));

CREATE POLICY ai_chat_actions_update ON ai_chat_actions FOR UPDATE
  USING (org_id IN (SELECT user_org_ids()));

CREATE POLICY ai_chat_actions_service ON ai_chat_actions FOR ALL
  USING (auth.role() = 'service_role');
