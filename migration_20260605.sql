-- =====================================================
-- 2026-06-05 迁移：点赞/点踩 + 角色扩展 + 删除用户
-- 执行位置：Supabase SQL Editor
-- =====================================================

-- 1. 创建点赞/点踩表
CREATE TABLE IF NOT EXISTS reactions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  target_type TEXT NOT NULL CHECK (target_type IN ('reply', 'announcement')),
  target_id UUID NOT NULL,
  reaction_type TEXT NOT NULL CHECK (reaction_type IN ('like', 'dislike')),
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, target_type, target_id)
);

-- RLS
ALTER TABLE reactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "reactions_open" ON reactions FOR ALL
  USING (true) WITH CHECK (true);

-- 授权
GRANT ALL ON TABLE reactions TO authenticated;
GRANT ALL ON TABLE reactions TO anon;

-- 2. profiles 表：放宽 role 字段，允许新角色值
-- 新角色值：business, business_assistant, tech_support, supervisor,
--           inspection_leader, inspection_engineer, customer_service, cs_leader, admin
-- (PostgreSQL TEXT 字段无约束，无需 ALTER，只需前端配合)

-- 3. 删除用户逻辑：保留 profiles 记录但清除个人信息，删除 auth.users
-- 创建辅助函数：管理员调用，清除用户个人信息但保留沟通记录
CREATE OR REPLACE FUNCTION delete_user_account(target_user_id UUID)
RETURNS void AS $$
BEGIN
  -- 清除 profiles 中的个人信息，但保留记录（FK 引用不会断）
  UPDATE profiles SET
    name = '已删除用户',
    username = 'deleted_' || substring(target_user_id::text, 1, 8),
    phone = '',
    email = 'deleted_' || substring(target_user_id::text, 1, 8) || '@deleted',
    region = '',
    department = '',
    is_disabled = true
  WHERE id = target_user_id;

  -- 删除 auth.users（触发 on_profile_deleted 不会触发，因为是直接删 auth）
  DELETE FROM auth.users WHERE id = target_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4. 给 notifications 表加删除权限（管理员删除通知）
-- 当前 RLS 是 USING(true)，所以已经可以 DELETE

-- 5. 确保 announcements 表可以删除
GRANT DELETE ON TABLE announcements TO authenticated;

-- Done!
SELECT '迁移完成：reactions表已创建、角色扩展已就绪、删除用户函数已创建' AS result;
