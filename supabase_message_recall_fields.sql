-- 为 communications 表添加消息撤回相关字段
-- 运行前请先在 Supabase SQL 编辑器中执行

DO $$
BEGIN
  -- 添加 is_recalled 字段（是否已撤回）
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'communications' AND column_name = 'is_recalled'
  ) THEN
    ALTER TABLE communications ADD COLUMN is_recalled BOOLEAN DEFAULT FALSE;
  END IF;

  -- 添加 recall_reason 字段（撤回原因）
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'communications' AND column_name = 'recall_reason'
  ) THEN
    ALTER TABLE communications ADD COLUMN recall_reason TEXT;
  END IF;

  -- 添加 recalled_at 字段（撤回时间）
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'communications' AND column_name = 'recalled_at'
  ) THEN
    ALTER TABLE communications ADD COLUMN recalled_at TIMESTAMPTZ;
  END IF;

  RAISE NOTICE '消息撤回字段已添加';
END
$$;

-- 创建索引以提高查询性能
CREATE INDEX IF NOT EXISTS idx_communications_is_recalled ON communications(is_recalled);

COMMENT ON COLUMN communications.is_recalled IS '是否已撤回';
COMMENT ON COLUMN communications.recall_reason IS '撤回原因';
COMMENT ON COLUMN communications.recalled_at IS '撤回时间';
