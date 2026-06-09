-- ============================================
-- Migration 006: 用户注册完整修复
-- 日期: 2026-06-09
-- 修复内容:
--   1. admin_create_user 支持重新激活已禁用用户
--   2. 修复 profiles_pkey 冲突（触发器先创建 profile，RPC 改用 UPDATE）
--   3. 修复 bcrypt 成本系数（gen_salt('bf', 10)）
--   4. 修复 auth.users 缺少 instance_id/aud/role 导致登录失败
--   5. 修复 reset_user_password 缺少 search_path
--   6. 删除无用的 delete_user_and_release_email
-- ============================================

-- ============================================
-- STEP 1: 修复 reset_user_password
-- ============================================
DROP FUNCTION IF EXISTS reset_user_password;

CREATE FUNCTION reset_user_password(
  target_user_id UUID,
  new_password TEXT
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
BEGIN
  UPDATE auth.users SET
    encrypted_password = extensions.crypt(new_password, extensions.gen_salt('bf', 10)),
    updated_at = now()
  WHERE id = target_user_id;
END;
$$;

-- ============================================
-- STEP 2: 重建 admin_create_user（完整修复版）
-- ============================================
DROP FUNCTION IF EXISTS admin_create_user;

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
  user_meta jsonb;
BEGIN
  IF p_email !~ '@cti-cert\.com$' THEN
    RAISE EXCEPTION '注册邮箱必须为 @cti-cert.com 企业邮箱';
  END IF;

  -- 查找已禁用的用户（同名/同邮箱/同 username）
  SELECT id INTO existing_disabled_id FROM public.profiles
  WHERE (email = p_email OR username = p_username OR name = p_name)
    AND is_disabled = true
  ORDER BY created_at ASC
  LIMIT 1;

  IF existing_disabled_id IS NOT NULL THEN
    -- 情况 A：重新激活
    user_meta := jsonb_build_object(
      'sub', existing_disabled_id,
      'username', p_username, 'name', p_name, 'role', p_role,
      'employee_id', p_employee_id, 'phone', p_phone,
      'department_level1', p_department_level1,
      'department_level2', p_department_level2,
      'department_level3', p_department_level3,
      'email_verified', true, 'phone_verified', false
    );

    UPDATE public.profiles SET
      name = p_name, username = p_username, role = p_role,
      employee_id = p_employee_id, phone = p_phone, email = p_email,
      department_level1 = p_department_level1,
      department_level2 = p_department_level2,
      department_level3 = p_department_level3,
      is_disabled = false
    WHERE id = existing_disabled_id;

    UPDATE auth.users SET
      encrypted_password = extensions.crypt(p_password, extensions.gen_salt('bf', 10)),
      updated_at = now(),
      email_confirmed_at = COALESCE(email_confirmed_at, now()),
      instance_id = '00000000-0000-0000-0000-000000000000',
      aud = 'authenticated',
      role = 'authenticated',
      raw_user_meta_data = user_meta
    WHERE id = existing_disabled_id;

    RETURN existing_disabled_id;
  END IF;

  -- 情况 B：全新用户
  new_user_id := extensions.uuid_generate_v4();

  user_meta := jsonb_build_object(
    'sub', new_user_id,
    'username', p_username, 'name', p_name, 'role', p_role,
    'employee_id', p_employee_id, 'phone', p_phone,
    'department_level1', p_department_level1,
    'department_level2', p_department_level2,
    'department_level3', p_department_level3,
    'email_verified', true, 'phone_verified', false
  );

  INSERT INTO auth.users (
    id, email, encrypted_password, email_confirmed_at,
    instance_id, aud, role,
    raw_app_meta_data, raw_user_meta_data,
    created_at, updated_at, confirmation_token,
    email_change, email_change_token_new, recovery_token
  ) VALUES (
    new_user_id, p_email,
    extensions.crypt(p_password, extensions.gen_salt('bf', 10)), now(),
    '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
    jsonb_build_object('provider', 'email', 'providers', ARRAY['email']),
    user_meta,
    now(), now(), '', '', '', ''
  );

  -- 触发器 on_auth_user_created 已创建 profile，UPDATE 补全字段
  UPDATE public.profiles SET
    name = p_name, username = p_username, role = p_role,
    employee_id = p_employee_id, phone = p_phone, email = p_email,
    region = p_region, department = p_department,
    department_level1 = p_department_level1,
    department_level2 = p_department_level2,
    department_level3 = p_department_level3,
    is_disabled = false
  WHERE id = new_user_id;

  RETURN new_user_id;
END;
$$;

-- ============================================
-- STEP 3: 删除无用的函数
-- ============================================
DROP FUNCTION IF EXISTS delete_user_and_release_email;

-- ============================================
-- 完成
-- ============================================
SELECT 'Migration 006 完成 - 完整修复版' AS result;
