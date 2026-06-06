-- ==========================================
-- 管理员操作日志表
-- ==========================================
CREATE TABLE IF NOT EXISTS admin_logs (
  id BIGSERIAL PRIMARY KEY,
  admin_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  admin_name TEXT,
  action TEXT NOT NULL,
  target_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  target_user_name TEXT,
  detail TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 索引
CREATE INDEX IF NOT EXISTS idx_admin_logs_admin_id ON admin_logs(admin_id);
CREATE INDEX IF NOT EXISTS idx_admin_logs_created_at ON admin_logs(created_at DESC);

-- 启用 RLS
ALTER TABLE admin_logs ENABLE ROW LEVEL SECURITY;

-- 策略：只有管理员可以查看所有日志
DROP POLICY IF EXISTS "管理员可查看所有操作日志" ON admin_logs;
CREATE POLICY "管理员可查看所有操作日志"
  ON admin_logs FOR SELECT
  USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- 策略：只有管理员可以插入日志（允许管理员记录自己的操作）
DROP POLICY IF EXISTS "管理员可插入操作日志" ON admin_logs;
CREATE POLICY "管理员可插入操作日志"
  ON admin_logs FOR INSERT
  WITH CHECK (admin_id = auth.uid());

-- ==========================================
-- 添加 updateLastActive 的 RPC 函数（如果不存在）
-- ==========================================
CREATE OR REPLACE FUNCTION public.update_last_active()
RETURNS void AS $$
BEGIN
  UPDATE public.profiles
  SET last_active_at = NOW()
  WHERE id = auth.uid();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
