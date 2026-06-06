-- 添加 last_active_at 字段到 profiles 表
-- 用于跟踪用户最后活跃时间，实现"是否在线"状态显示

-- PostgreSQL 不支持 ADD COLUMN IF NOT EXISTS，使用 DO 块实现幂等
DO $$ 
BEGIN 
  BEGIN
    ALTER TABLE profiles ADD COLUMN last_active_at TIMESTAMPTZ DEFAULT NULL;
    RAISE NOTICE '字段 last_active_at 已添加';
  EXCEPTION
    WHEN duplicate_column THEN 
      RAISE NOTICE '字段 last_active_at 已存在，跳过';
  END;
END $$;

-- 创建索引，加快查询
CREATE INDEX IF NOT EXISTS idx_profiles_last_active_at 
ON profiles(last_active_at) 
WHERE last_active_at IS NOT NULL;

-- 可选：创建一个视图，方便查询用户在线状态
-- CREATE OR REPLACE VIEW user_online_status AS
-- SELECT 
--   id,
--   name,
--   employee_id,
--   role,
--   last_active_at,
--   CASE 
--     WHEN last_active_at >= NOW() - INTERVAL '30 minutes' THEN TRUE
--     ELSE FALSE
--   END as is_online
-- FROM profiles
-- WHERE is_disabled = FALSE;

-- 说明：
-- 1. 运行此 SQL 后，profiles 表会新增 last_active_at 字段
-- 2. 前端会在用户打开页面时定期更新此字段
-- 3. 管理员界面根据此字段判断用户是否在线（30分钟内有活动则认为在线）
-- 4. 如果不想用触发器，也可以在前端定期更新此字段
