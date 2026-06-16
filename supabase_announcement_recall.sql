-- ==========================================
-- 通知公告撤回功能迁移脚本
-- 添加 status / recalled_at / republished_at 字段
-- ==========================================

-- 1. 添加 status 字段（active=正常, recalled=已撤回）
ALTER TABLE announcements
  ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'active';

-- 2. 添加撤回时间戳
ALTER TABLE announcements
  ADD COLUMN IF NOT EXISTS recalled_at timestamptz;

-- 3. 添加重发时间戳（修改撤回内容后重新发布时记录）
ALTER TABLE announcements
  ADD COLUMN IF NOT EXISTS republished_at timestamptz;

-- 4. 为 status 建索引（非管理员查询过滤 recalled）
CREATE INDEX IF NOT EXISTS idx_announcements_status ON announcements (status);
