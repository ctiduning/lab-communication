-- ============================================================
-- 诊断 SQL：检查撤回功能和待处理数量问题
-- 在 Supabase SQL Editor 中运行此脚本
-- ============================================================

-- 1. 检查 communications 表是否有撤回相关字段
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'communications'
  AND column_name IN ('is_recalled', 'recall_reason', 'recalled_at', 'is_system_notification')
ORDER BY column_name;

-- 如果上面查询没有返回4行，说明字段不存在，运行下面的添加字段SQL：
-- ALTER TABLE communications ADD COLUMN IF NOT EXISTS is_recalled BOOLEAN DEFAULT FALSE;
-- ALTER TABLE communications ADD COLUMN IF NOT EXISTS recall_reason TEXT;
-- ALTER TABLE communications ADD COLUMN IF NOT EXISTS recalled_at TIMESTAMPTZ;
-- ALTER TABLE communications ADD COLUMN IF NOT EXISTS is_system_notification BOOLEAN DEFAULT FALSE;

-- 2. 查看所有已撤回的消息
SELECT id, sender_id, content, is_recalled, recall_reason, recalled_at, created_at
FROM communications
WHERE is_recalled = TRUE
ORDER BY recalled_at DESC;

-- 3. 查看所有系统通知消息（撤回通知等）
SELECT id, sender_id, content, is_system_notification, created_at
FROM communications
WHERE is_system_notification = TRUE
ORDER BY created_at DESC;

-- 4. 查看某个用户（替换 '用户UUID' 为实际UUID）的待处理消息详情
-- 先查这个用户在 communication_recipients 里所有未回复且未完结的记录
/*
SELECT 
  cr.communication_id,
  cr.recipient_id,
  cr.has_replied,
  cr.is_completed AS my_completed,
  c.is_completed AS global_completed,
  c.is_recalled,
  c.is_system_notification,
  c.content
FROM communication_recipients cr
JOIN communications c ON c.id = cr.communication_id
WHERE cr.recipient_id = '用户UUID'   -- ← 替换成实际用户UUID
  AND cr.has_replied = FALSE
  AND cr.is_completed = FALSE
ORDER BY c.created_at DESC;
*/

-- 5. 统计每个用户的待处理消息数量（对比前端显示）
SELECT 
  cr.recipient_id,
  p.name,
  COUNT(*) AS pending_count
FROM communication_recipients cr
JOIN communications c ON c.id = cr.communication_id
LEFT JOIN profiles p ON p.id = cr.recipient_id
WHERE cr.has_replied = FALSE
  AND cr.is_completed = FALSE
  AND c.is_completed = FALSE
  AND (c.is_recalled IS NULL OR c.is_recalled = FALSE)
  AND (c.is_system_notification IS NULL OR c.is_system_notification = FALSE)
GROUP BY cr.recipient_id, p.name
ORDER BY pending_count DESC;

-- 6. 重置：把所有 is_recalled 为 NULL 的设为 FALSE（数据清洗）
-- UPDATE communications SET is_recalled = FALSE WHERE is_recalled IS NULL;
-- UPDATE communications SET is_system_notification = FALSE WHERE is_system_notification IS NULL;

-- 7. 如果撤回功能完全不工作，可以手动把某条消息标记为撤回（用于测试）
-- UPDATE communications 
-- SET is_recalled = TRUE, recall_reason = '测试撤回', recalled_at = NOW()
-- WHERE id = '消息UUID';  -- ← 替换成实际消息ID
