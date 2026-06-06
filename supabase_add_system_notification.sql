-- 为 communications 表添加系统通知标识字段
-- 运行前请先在 Supabase SQL 编辑器中执行

DO $$
BEGIN
  -- 添加 is_system_notification 字段（是否是系统通知）
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'communications' AND column_name = 'is_system_notification'
  ) THEN
    ALTER TABLE communications ADD COLUMN is_system_notification BOOLEAN DEFAULT FALSE;
  END IF;

  RAISE NOTICE '系统通知字段已添加';
END
$$;

-- 创建索引以提高查询性能
CREATE INDEX IF NOT EXISTS idx_communications_is_system ON communications(is_system_notification);

COMMENT ON COLUMN communications.is_system_notification IS '是否是系统通知消息';
