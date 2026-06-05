-- =====================================================
-- 通知公告模块重构：从"推消息"改为"拉取+已读追踪"
-- 执行位置：Supabase SQL Editor
-- =====================================================

-- 1. 创建公告已读记录表
CREATE TABLE IF NOT EXISTS announcement_reads (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  announcement_id UUID NOT NULL REFERENCES announcements(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  read_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(announcement_id, user_id)
);

-- 2. 开发阶段RLS：允许所有认证用户操作
ALTER TABLE announcement_reads ENABLE ROW LEVEL SECURITY;

-- 允许所有人查看已读记录
CREATE POLICY "Anyone can read announcement_reads"
  ON announcement_reads FOR SELECT
  USING (true);

-- 允许认证用户插入自己的已读记录
CREATE POLICY "Users can insert own read records"
  ON announcement_reads FOR INSERT
  WITH CHECK (true);

-- 允许用户更新自己的已读记录
CREATE POLICY "Users can update own read records"
  ON announcement_reads FOR UPDATE
  USING (true)
  WITH CHECK (true);

-- 3. 授权
GRANT ALL ON TABLE announcement_reads TO authenticated;
GRANT ALL ON TABLE announcement_reads TO anon;

-- 4. 确保 announcements 表也有正确的 RLS 和权限
-- （之前可能已经设置过，这里确认一下）
GRANT SELECT ON TABLE announcements TO authenticated;
GRANT INSERT ON TABLE announcements TO authenticated;
GRANT UPDATE ON TABLE announcements TO authenticated;
