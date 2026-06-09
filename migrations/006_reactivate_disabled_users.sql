-- ============================================
-- Migration 006: 已禁用用户重新激活支持
-- 日期: 2026-06-09
-- 说明:
--   修改 admin_create_user RPC:
--   如果存在已禁用的用户（相同 email 或 username），
--   直接 UPDATE 重新激活，而不是 INSERT 新记录。
--   同时删除多余的 delete_user_and_release_email（从未正常工作过）。
--   前端不再尝试用 anon key 删除 profiles（RLS 权限不足），
--   全部交给 RPC 处理。
-- ============================================

-- ============================================
-- STEP 1: 先删除旧函数（避免 "not unique" 错误）
-- ============================================
DROP FUNCTION IF EXISTS admin_create_user;

-- ============================================
-- STEP 2: 重建 admin_create_user，支持重新激活
-- 核心逻辑：
--   1. 查找同 email 或同 username 的已禁用用户
--   2. 找到 → UPDATE profiles + UPDATE auth.users（重置密码）
--   3. 未找到 → INSERT 新用户（原逻辑）
-- ============================================
CREATE FUNCTION admin_create_user(
  p_email TEXT,
  p_password TEXT,
  p_username TEXT,
  p_name TEXT,
  p_role TEXT,
  p_employee_id TEXT DEFAULT '',
  p_phone TEXT DEFAULT '',
  p_region TEXT DEFAULT '',
  p_department TEXT DEFAULT '',
  p_department_level1 TEXT DEFAULT '',
  p_department_level2 TEXT DEFAULT '',
  p_department_level3 TEXT DEFAULT '',
  p_must_change_pwd BOOLEAN DEFAULT true
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
  new_user_id UUID;
  existing_disabled_id UUID;
BEGIN
  -- 验证邮箱格式
  IF p_email !~ '@cti-cert\.com$' THEN
    RAISE EXCEPTION '注册邮箱必须为 @cti-cert.com 企业邮箱';
  END IF;

  -- 查找已禁用的用户（相同 email 或 username）
  SELECT id INTO existing_disabled_id FROM public.profiles
  WHERE (email = p_email OR username = p_username)
    AND is_disabled = true
  ORDER BY created_at ASC
  LIMIT 1;

  IF existing_disabled_id IS NOT NULL THEN
    -- ============================================
    -- 情况 A：已禁用用户 → 重新激活
    -- ============================================

    -- 更新 profiles 记录
    UPDATE public.profiles SET
      name = p_name,
      username = p_username,
      role = p_role,
      employee_id = p_employee_id,
      phone = p_phone,
      email = p_email,
      department_level1 = p_department_level1,
      department_level2 = p_department_level2,
      department_level3 = p_department_level3,
      is_disabled = false
    WHERE id = existing_disabled_id;

    -- 重置密码（auth.users 的 encrypted_password 字段）
    UPDATE auth.users SET
      encrypted_password = extensions.crypt(p_password, extensions.gen_salt('bf')),
      updated_at = now(),
      email_confirmed_at = COALESCE(email_confirmed_at, now())
    WHERE id = existing_disabled_id;

    RETURN existing_disabled_id;
  END IF;

  -- ============================================
  -- 情况 B：全新用户 → INSERT
  -- ============================================
  new_user_id := extensions.uuid_generate_v4();

  INSERT INTO auth.users (
    id, email, encrypted_password, email_confirmed_at,
    raw_app_meta_data, raw_user_meta_data,
    created_at, updated_at, confirmation_token,
    email_change, email_change_token_new, recovery_token
  ) VALUES (
    new_user_id,
    p_email,
    extensions.crypt(p_password, extensions.gen_salt('bf')),
    now(),
    jsonb_build_object('provider', 'email', 'providers', ARRAY['email']),
    jsonb_build_object('username', p_username),
    now(), now(),
    '', '', '', ''
  );

  INSERT INTO public.profiles (
    id, name, username, role, employee_id,
    phone, email, region, department,
    department_level1, department_level2, department_level3,
    created_at, is_disabled
  ) VALUES (
    new_user_id,
    p_name, p_username, p_role, p_employee_id,
    p_phone, p_email, p_region, p_department,
    p_department_level1, p_department_level2, p_department_level3,
    now(), false
  );

  RETURN new_user_id;
END;
$$;

-- ============================================
-- STEP 3: 删除无用的 delete_user_and_release_email
-- 这个函数从未正常工作过（service_role key 权限不足）
-- ============================================
DROP FUNCTION IF EXISTS delete_user_and_release_email;

-- ============================================
-- 完成
-- ============================================
SELECT 'Migration 006 完成 - admin_create_user 已支持重新激活已禁用用户' AS result;
