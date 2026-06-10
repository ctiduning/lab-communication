-- ==========================================
-- QDCTI 系统数据库变更 SQL
-- 日期: 2026-06-11
-- ==========================================

-- ==========================================
-- 1. 公告红旗标记 (announcement_flags)
-- ==========================================

-- 创建公告标记表（如不存在）
CREATE TABLE IF NOT EXISTS announcement_flags (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  announcement_id UUID NOT NULL REFERENCES announcements(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, announcement_id)
);

-- 启用 RLS
ALTER TABLE announcement_flags ENABLE ROW LEVEL SECURITY;

-- 删除旧策略（如有）
DROP POLICY IF EXISTS "users_own_flags" ON announcement_flags;

-- 创建 RLS 策略：仅用户自己管理自己的标记
CREATE POLICY "users_own_flags" ON announcement_flags
  FOR ALL TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- ==========================================
-- 2. 邮件式 Thread 回复 (target_recipient_id)
-- ==========================================

-- 在 replies 表中添加 target_recipient_id 字段（nullable）
-- null = 回复全部接收人
-- 有值 = 只回复该接收人（如发件人回复某个收件人）
ALTER TABLE replies ADD COLUMN IF NOT EXISTS target_recipient_id UUID REFERENCES auth.users(id) ON DELETE SET NULL;

-- ==========================================
-- 3. SentMessages 状态简化说明
-- ==========================================
-- 不再使用 communication_recipients.is_completed（个人完结）
-- 完结权统一归发起人：communications.is_completed（全局完结）
-- 接收人端不再显示"完结"/"取消完结"按钮
-- 发送人端在详情弹窗中保留"标记整体完结"/"取消整体完结"按钮

-- 注意：旧的 is_completed 数据保留不动，前端不再使用
