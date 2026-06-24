-- ==========================================
-- user_cc_favorites RLS 策略
-- 解决保存抄送人预设报 403 的问题
-- 在 Supabase SQL Editor 中执行
-- ==========================================

-- 1. 启用 RLS（如果还没启用的话）
ALTER TABLE user_cc_favorites ENABLE ROW LEVEL SECURITY;

-- 2. 删除已有策略（以防重复执行报错）
DROP POLICY IF EXISTS "用户可以查看自己的抄送人预设" ON user_cc_favorites;
DROP POLICY IF EXISTS "用户可以添加自己的抄送人预设" ON user_cc_favorites;
DROP POLICY IF EXISTS "用户可以删除自己的抄送人预设" ON user_cc_favorites;

-- 3. SELECT：用户只能读取自己的预设
CREATE POLICY "用户可以查看自己的抄送人预设"
  ON user_cc_favorites
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

-- 4. INSERT：用户只能插入 user_id 为自己的记录
CREATE POLICY "用户可以添加自己的抄送人预设"
  ON user_cc_favorites
  FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

-- 5. DELETE：用户只能删除自己的预设
CREATE POLICY "用户可以删除自己的抄送人预设"
  ON user_cc_favorites
  FOR DELETE
  TO authenticated
  USING (user_id = auth.uid());
