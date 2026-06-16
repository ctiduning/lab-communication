CREATE TABLE IF NOT EXISTS message_templates (
  id BIGSERIAL PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  title TEXT NOT NULL DEFAULT '',
  content TEXT NOT NULL DEFAULT '',
  usage_count INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_message_templates_user ON message_templates(user_id);

ALTER TABLE message_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "用户只能管理自己的模板"
  ON message_templates FOR ALL
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());
