-- ==========================================
-- QDCTI 系统数据库变更 SQL（简化版）
-- ==========================================

-- ==========================================
-- 1. 公告🚩标记 - 在 announcement_reads 表加字段
-- ==========================================

-- 添加 is_flagged 列（如已存在则跳过）
ALTER TABLE announcement_reads ADD COLUMN IF NOT EXISTS is_flagged BOOLEAN DEFAULT false;

-- 可选：如果之前创建了 announcement_flags 表，可以删除
-- DROP TABLE IF EXISTS announcement_flags;

-- ==========================================
-- 2. 邮件式 Thread 回复 (target_recipient_id)
-- ==========================================
ALTER TABLE replies ADD COLUMN IF NOT EXISTS target_recipient_id UUID REFERENCES auth.users(id) ON DELETE SET NULL;
