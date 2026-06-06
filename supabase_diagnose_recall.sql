-- ========== 诊断：检查 communications 表结构 =========
-- 在 Supabase SQL 编辑器中运行，查看输出结果

-- 1. 检查 communications 表是否有撤回相关字段
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_name = 'communications'
  AND column_name IN ('is_recalled', 'recall_reason', 'recalled_at', 'is_system_notification')
ORDER BY column_name;

-- 2. 如果上面查询没有结果，说明字段不存在，运行下面的添加字段 SQL
-- ===== 添加撤回字段（如果不存在）=====
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'communications' AND column_name = 'is_recalled') THEN
    ALTER TABLE communications ADD COLUMN is_recalled BOOLEAN DEFAULT FALSE;
    RAISE NOTICE '已添加 is_recalled 字段';
  ELSE
    RAISE NOTICE 'is_recalled 字段已存在';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'communications' AND column_name = 'recall_reason') THEN
    ALTER TABLE communications ADD COLUMN recall_reason TEXT;
    RAISE NOTICE '已添加 recall_reason 字段';
  ELSE
    RAISE NOTICE 'recall_reason 字段已存在';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'communications' AND column_name = 'recalled_at') THEN
    ALTER TABLE communications ADD COLUMN recalled_at TIMESTAMPTZ;
    RAISE NOTICE '已添加 recalled_at 字段';
  ELSE
    RAISE NOTICE 'recalled_at 字段已存在';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'communications' AND column_name = 'is_system_notification') THEN
    ALTER TABLE communications ADD COLUMN is_system_notification BOOLEAN DEFAULT FALSE;
    RAISE NOTICE '已添加 is_system_notification 字段';
  ELSE
    RAISE NOTICE 'is_system_notification 字段已存在';
  END IF;
END
$$;

-- 3. 验证：查看撤回功能的 RLS 策略
SELECT * FROM pg_policies WHERE tablename = 'communications';

-- 4. 测试：查看是否有已撤回的消息
SELECT id, sender_id, content, is_recalled, recall_reason, recalled_at
FROM communications
WHERE is_recalled = TRUE
LIMIT 5;
