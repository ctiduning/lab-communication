-- ==========================================
-- 修复 announcement_reads 表 RLS 安全漏洞
-- 问题：INSERT 策略可能被绕过，允许冒充他人标记已读
-- 修复：确保 INSERT 策略严格检查 user_id = auth.uid()
-- ==========================================

-- 1. 删除旧的 INSERT 策略（如果存在）
DROP POLICY IF EXISTS "用户可以标记公告已读" ON public.announcement_reads;

-- 2. 创建正确的 INSERT 策略（严格检查）
CREATE POLICY "用户可以标记公告已读"
  ON public.announcement_reads
  FOR INSERT
  WITH CHECK (
    auth.uid() = user_id
    AND auth.role() = 'authenticated'
  );

-- 3. 同时检查 SELECT 策略是否正确（只读自己的）
DROP POLICY IF EXISTS "用户可以读取自己的已读记录" ON public.announcement_reads;

CREATE POLICY "用户可以读取自己的已读记录"
  ON public.announcement_reads
  FOR SELECT
  USING (auth.uid() = user_id);

-- 4. 确保 RLS 已启用
ALTER TABLE public.announcement_reads ENABLE ROW LEVEL SECURITY;

-- 5. 验证：查看当前所有策略
SELECT
  policyname,
  cmd,
  qual,
  with_check
FROM pg_policies
WHERE tablename = 'announcement_reads';

-- ==========================================
-- 同样修复 actions 表（防止冒充点赞）
-- ==========================================
DROP POLICY IF EXISTS "用户可以管理自己的点赞" ON public.actions;

CREATE POLICY "用户可以管理自己的点赞"
  ON public.actions
  FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- 完成提示
SELECT 'RLS 安全策略修复完成！' as result;
