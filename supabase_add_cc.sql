-- ==========================================
-- 消息抄送人功能：数据库迁移
-- 运行前请先在 Supabase SQL Editor 中执行
-- ==========================================

-- 1. communication_recipients 表增加 is_cc 字段
ALTER TABLE communication_recipients
  ADD COLUMN IF NOT EXISTS is_cc BOOLEAN DEFAULT FALSE;

COMMENT ON COLUMN communication_recipients.is_cc IS '是否为抄送人（true=抄送人，false=接收人）';

-- 2. 创建抄送频率表（记录每个用户抄送各人的次数）
CREATE TABLE IF NOT EXISTS cc_frequencies (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES profiles(id) NOT NULL,
  cc_user_id UUID REFERENCES profiles(id) NOT NULL,
  count INTEGER DEFAULT 1,
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, cc_user_id)
);

-- 创建索引
CREATE INDEX IF NOT EXISTS idx_cc_frequencies_user ON cc_frequencies(user_id);
CREATE INDEX IF NOT EXISTS idx_cc_frequencies_user_count ON cc_frequencies(user_id, count DESC);

COMMENT ON TABLE cc_frequencies IS '抄送频率统计，每人记录各抄送对象的次数';
COMMENT ON COLUMN cc_frequencies.user_id IS '发起人ID';
COMMENT ON COLUMN cc_frequencies.cc_user_id IS '被抄送人ID';
COMMENT ON COLUMN cc_frequencies.count IS '抄送次数';
