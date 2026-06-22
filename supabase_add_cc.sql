-- ==========================================
-- 消息抄送人功能：数据库迁移（手动版）
-- 运行前请先在 Supabase SQL Editor 中执行
-- ==========================================

-- 1. communication_recipients 表增加 is_cc 字段
ALTER TABLE communication_recipients
  ADD COLUMN IF NOT EXISTS is_cc BOOLEAN DEFAULT FALSE;

COMMENT ON COLUMN communication_recipients.is_cc IS '是否为抄送人（true=抄送人，false=接收人）';

-- 2. 删掉旧的自动频率表（如果有的话）
DROP TABLE IF EXISTS cc_frequencies;

-- 3. 创建手动常用抄送人表
CREATE TABLE IF NOT EXISTS user_cc_favorites (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES profiles(id) NOT NULL,
  cc_user_id UUID REFERENCES profiles(id) NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, cc_user_id)
);

CREATE INDEX IF NOT EXISTS idx_user_cc_favorites_user ON user_cc_favorites(user_id);

COMMENT ON TABLE user_cc_favorites IS '用户手动设置的常用抄送人列表';
COMMENT ON COLUMN user_cc_favorites.user_id IS '发起人ID';
COMMENT ON COLUMN user_cc_favorites.cc_user_id IS '被抄送人ID';
