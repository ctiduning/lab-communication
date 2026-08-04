-- ==========================================
-- 草稿箱功能：服务端草稿表
-- ==========================================

CREATE TABLE IF NOT EXISTS user_drafts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id),
  draft_type TEXT NOT NULL DEFAULT 'business',  -- 'business' | 'lab'
  content JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- RLS
ALTER TABLE user_drafts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "用户管理自己的草稿" ON user_drafts;
CREATE POLICY "用户管理自己的草稿"
  ON user_drafts
  FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- 索引
CREATE INDEX IF NOT EXISTS idx_user_drafts_user_id ON user_drafts(user_id);
CREATE INDEX IF NOT EXISTS idx_user_drafts_type ON user_drafts(draft_type);
