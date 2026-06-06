-- ==========================================
-- 消息已读回执表
-- 在 Supabase SQL 编辑器中运行
-- ==========================================

CREATE TABLE IF NOT EXISTS message_reads (
  id BIGSERIAL PRIMARY KEY,
  communication_id UUID NOT NULL REFERENCES communications(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  read_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(communication_id, user_id)
);

-- 创建索引
CREATE INDEX IF NOT EXISTS idx_message_reads_communication_id 
  ON message_reads(communication_id);
CREATE INDEX IF NOT EXISTS idx_message_reads_user_id 
  ON message_reads(user_id);

-- 启用 RLS
ALTER TABLE message_reads ENABLE ROW LEVEL SECURITY;

-- RLS 策略：用户可以读取自己的已读记录
DROP POLICY IF EXISTS "用户可以读取自己的已读记录" ON message_reads;
CREATE POLICY "用户可以读取自己的已读记录" 
  ON message_reads FOR SELECT 
  USING (auth.uid() = user_id);

-- RLS 策略：用户可以标记消息已读（只能插入自己的 user_id）
DROP POLICY IF EXISTS "用户可以标记消息已读" ON message_reads;
CREATE POLICY "用户可以标记消息已读" 
  ON message_reads FOR INSERT 
  WITH CHECK (auth.uid() = user_id);

-- RLS 策略：管理员可以读取所有已读记录
DROP POLICY IF EXISTS "管理员可以读取所有已读记录" ON message_reads;
CREATE POLICY "管理员可以读取所有已读记录" 
  ON message_reads FOR SELECT 
  USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- 管理员可以查看谁已读了某条消息
CREATE OR REPLACE FUNCTION get_message_reads(comm_id UUID)
RETURNS TABLE (
  user_id UUID,
  user_name TEXT,
  user_employee_id TEXT,
  read_at TIMESTAMPTZ
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    mr.user_id,
    p.name,
    p.employee_id,
    mr.read_at
  FROM message_reads mr
  JOIN profiles p ON p.id = mr.user_id
  WHERE mr.communication_id = comm_id
  ORDER BY mr.read_at ASC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
