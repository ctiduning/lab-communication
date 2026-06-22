-- ==========================================
-- 追加对所有人发送消息功能：新增 is_append_forward 字段
-- ==========================================

-- 在 communications 表中添加 is_append_forward 布尔字段
ALTER TABLE communications 
ADD COLUMN IF NOT EXISTS is_append_forward BOOLEAN DEFAULT FALSE;

-- 添加索引（可选，加速查找追加重发的记录）
CREATE INDEX IF NOT EXISTS idx_communications_append_forward 
ON communications (is_append_forward);
