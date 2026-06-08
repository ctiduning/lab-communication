-- 部门名片回复同步功能：为 communication_recipients 表添加 replied_by 字段
-- 用于记录同组中谁先回复了消息
ALTER TABLE communication_recipients 
ADD COLUMN IF NOT EXISTS replied_by TEXT DEFAULT NULL;
