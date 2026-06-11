-- ==========================================
-- 性能优化：添加数据库索引
-- 执行日期：2026-06-12
-- ==========================================

-- 1. communications 表：sender_id 和 is_recalled 频繁用于过滤
CREATE INDEX IF NOT EXISTS idx_communications_sender_id ON communications(sender_id);
CREATE INDEX IF NOT EXISTS idx_communications_is_recalled ON communications(is_recalled);

-- 2. communication_recipients 表：最频繁 JOIN/过滤的表，缺索引
CREATE INDEX IF NOT EXISTS idx_comm_recipients_comm_id_recipient_id ON communication_recipients(communication_id, recipient_id);

-- 3. replies 表：getReplies 按 communication_id 查询
CREATE INDEX IF NOT EXISTS idx_replies_communication_id ON replies(communication_id);

-- 4. notifications 表：按 user_id 和 is_read 过滤
CREATE INDEX IF NOT EXISTS idx_notifications_user_id_is_read ON notifications(user_id, is_read);

-- 5. reactions 表：按 (target_type, target_id) 组合查询
CREATE INDEX IF NOT EXISTS idx_reactions_target ON reactions(target_type, target_id);

-- 6. announcement_reads 表
CREATE INDEX IF NOT EXISTS idx_announcement_reads_user_id_announcement_id ON announcement_reads(user_id, announcement_id);
