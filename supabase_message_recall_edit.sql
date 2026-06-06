-- ==========================================
-- 消息撤回/编辑 - 添加字段
-- 在 Supabase SQL 编辑器中运行
-- ==========================================

-- 添加 updated_at 字段
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'communications' AND column_name = 'updated_at'
  ) THEN
    ALTER TABLE communications ADD COLUMN updated_at TIMESTAMPTZ DEFAULT NULL;
    RAISE NOTICE '字段 updated_at 已添加到 communications 表';
  ELSE
    RAISE NOTICE '字段 updated_at 已存在';
  END IF;
END $$;

-- 添加 is_deleted 字段
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'communications' AND column_name = 'is_deleted'
  ) THEN
    ALTER TABLE communications ADD COLUMN is_deleted BOOLEAN DEFAULT FALSE;
    RAISE NOTICE '字段 is_deleted 已添加到 communications 表';
  ELSE
    RAISE NOTICE '字段 is_deleted 已存在';
  END IF;
END $$;

-- 创建索引
CREATE INDEX IF NOT EXISTS idx_communications_updated_at 
  ON communications(updated_at);
CREATE INDEX IF NOT EXISTS idx_communications_is_deleted 
  ON communications(is_deleted);

-- 验证
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'communications' 
  AND column_name IN ('updated_at', 'is_deleted');
