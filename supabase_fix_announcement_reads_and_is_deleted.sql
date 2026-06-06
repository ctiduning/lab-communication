-- ==========================================
-- 公告已读记录表（如果不存在则创建）
-- ==========================================
CREATE TABLE IF NOT EXISTS announcement_reads (
  id BIGSERIAL PRIMARY KEY,
  announcement_id UUID NOT NULL REFERENCES announcements(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  read_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(announcement_id, user_id)
);

-- 创建索引
CREATE INDEX IF NOT EXISTS idx_announcement_reads_announcement_id 
  ON announcement_reads(announcement_id);
CREATE INDEX IF NOT EXISTS idx_announcement_reads_user_id 
  ON announcement_reads(user_id);

-- 启用 RLS（行级安全）
ALTER TABLE announcement_reads ENABLE ROW LEVEL SECURITY;

-- 允许用户读取自己的已读记录
DROP POLICY IF EXISTS "用户可以读取自己的已读记录" ON announcement_reads;
CREATE POLICY "用户可以读取自己的已读记录" 
  ON announcement_reads FOR SELECT 
  USING (auth.uid() = user_id);

-- 允许用户插入自己的已读记录
DROP POLICY IF EXISTS "用户可以标记公告已读" ON announcement_reads;
CREATE POLICY "用户可以标记公告已读" 
  ON announcement_reads FOR INSERT 
  WITH CHECK (auth.uid() = user_id);

-- 允许管理员读取所有已读记录
DROP POLICY IF EXISTS "管理员可以读取所有已读记录" ON announcement_reads;
CREATE POLICY "管理员可以读取所有已读记录" 
  ON announcement_reads FOR SELECT 
  USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );


-- ==========================================
-- 检查 communications 表是否有 is_deleted 字段
-- 如果没有，添加它（用于软删除）
-- ==========================================
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

-- 如果原来有 isDeleted (驼峰) 字段，把它的值迁移到 is_deleted 并删除旧字段
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'communications' AND column_name = 'isDeleted'
  ) THEN
    -- 迁移数据
    UPDATE communications SET is_deleted = TRUE WHERE "isDeleted" = TRUE;
    -- 删除旧字段（如果新字段已存在）
    -- 注意：需要先删除约束
    RAISE NOTICE '发现旧字段 isDeleted，请手动处理迁移后删除';
  END IF;
END $$;
