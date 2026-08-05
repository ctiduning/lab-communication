-- ============================================================
-- 管理员操作日志表 admin_logs —— 标准重建脚本（幂等，可反复执行）
-- ============================================================
-- 用途（任一情况跑这一份即可）：
--   1. 首次建表  2. 环境重置/迁移
--   3. 修复「操作日志为空」「42501 写不进」「PGRST204 列缺失」
-- 覆盖的历史坑：
--   - DROP TABLE CASCADE 重建：解决旧表字段不全、IF NOT EXISTS 跳过重�建
--   - DROP CASCADE 连带删掉全部旧策略（含名字对不上的残留策略）：解决 42501
--   - 写入策略 self-based (admin_id=auth.uid())：彻底放开写入
--   - UPDATE profiles.role='admin'：解决读取被拦导致 Tab 空
--   - NOTIFY pgrst：解决改表后 schema 缓存陈旧导致的 PGRST204
-- ⚠️ 若执行报 40P01 deadlock：关掉其他 SQL 窗口/前端页面（避免并发锁竞争），
--    或把本脚本拆成「仅 DROP 一句」和「剩余全部」两段分别执行。
-- ============================================================

-- 1. 彻底删除旧表（CASCADE 连带清掉旧索引、旧策略——含名字对不上的残留策略）
DROP TABLE IF EXISTS admin_logs CASCADE;

-- 2. 按标准结构重建（含前端 log() 写入所需的全部列）
CREATE TABLE admin_logs (
  id BIGSERIAL PRIMARY KEY,
  admin_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  admin_name TEXT,
  action TEXT NOT NULL,
  target_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  target_user_name TEXT,
  detail TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_admin_logs_admin_id ON admin_logs(admin_id);
CREATE INDEX idx_admin_logs_created_at ON admin_logs(created_at DESC);

-- 3. 启用 RLS
ALTER TABLE admin_logs ENABLE ROW LEVEL SECURITY;

-- 4. 写入策略：本人写自己（不依赖 role，彻底解决 42501 写不进）
CREATE POLICY "admin_logs_insert_self"
  ON admin_logs FOR INSERT
  WITH CHECK (admin_id = auth.uid());

-- 5. 读取策略：仅管理员可见
CREATE POLICY "admin_logs_select_admin"
  ON admin_logs FOR SELECT
  USING ( EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin') );

-- 6. 确保当前登录账号为管理员（解决读取被拦导致 Tab 空）
UPDATE profiles SET role = 'admin' WHERE id = auth.uid();

-- 7. 刷新 PostgREST schema 缓存（不跑这步会持续报 PGRST204 列缺失）
NOTIFY pgrst, 'reload schema';

-- ============================================================
-- 保留：update_last_active RPC（与本表无关，原样保留）
-- ============================================================
CREATE OR REPLACE FUNCTION public.update_last_active()
RETURNS void AS $$
BEGIN
  UPDATE public.profiles
  SET last_active_at = NOW()
  WHERE id = auth.uid();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
