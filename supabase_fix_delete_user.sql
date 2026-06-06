-- ============================================
-- 彻底修复"删除用户后无法重新注册"的问题
-- 在 Supabase SQL 编辑器中运行一次即可
-- ============================================

-- 1. 创建删除用户并释放邮箱的数据库函数
-- 使用 SECURITY DEFINER 以高权限运行，可以修改 auth.users 表
CREATE OR REPLACE FUNCTION delete_user_and_release_email(target_user_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
  released_email TEXT;
BEGIN
  released_email := 'deleted_' || target_user_id || '@deleted.local';

  -- 1. 更新 auth.users 的 email（释放原邮箱供重新注册）
  UPDATE auth.users
  SET email = released_email,
      email_confirmed_at = NOW(),
      raw_user_meta_data = jsonb_set(
        COALESCE(raw_user_meta_data, '{}'::jsonb),
        '{email}',
        to_jsonb(released_email)
      )
  WHERE id = target_user_id;

  -- 2. 更新 profiles 表（标记已删除，释放用户名）
  UPDATE public.profiles
  SET name = '已删除用户',
      username = 'deleted_' || substring(target_user_id::text, 1, 8),
      email = released_email,
      phone = '',
      region = '',
      department = '',
      is_disabled = TRUE,
      must_change_password = FALSE,
      updated_at = NOW()
  WHERE id = target_user_id;
END;
$$;

-- 授予权限（允许登录用户调用）
GRANT EXECUTE ON FUNCTION delete_user_and_release_email(UUID) TO authenticated;

-- 完成提示
SELECT 'delete_user_and_release_email 函数创建成功！现在删除用户时会释放邮箱，可以重新注册。' AS result;
