-- ==========================================
-- 功能一：已读回执升级版（read_at 时间戳）
-- ==========================================
ALTER TABLE communication_recipients ADD COLUMN IF NOT EXISTS read_at TIMESTAMPTZ;

-- ==========================================
-- 功能二：快捷回复自定义（用户常用语库）
-- ==========================================
CREATE TABLE IF NOT EXISTS user_quick_replies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id),
  content TEXT NOT NULL,
  sort_order INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE user_quick_replies ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "用户管理自己的快捷回复" ON user_quick_replies;
CREATE POLICY "用户管理自己的快捷回复"
  ON user_quick_replies
  FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_quick_replies_user ON user_quick_replies(user_id);
