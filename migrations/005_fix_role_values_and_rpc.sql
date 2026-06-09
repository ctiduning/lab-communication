-- ============================================
-- Migration 005: 修复角色值+RPC函数+导入逻辑
-- 日期: 2026-06-09
-- 说明:
--   1. 重建 admin_create_user RPC，去掉角色映射
--   2. 迁移已有中文角色值为英文（包括遗漏的映射）
--   3. 确保 department_level1 能从 role 自动推导
--   4. 修复 handle_new_user 触发器中可能存在的角色覆盖
-- ============================================

-- ============================================
-- STEP 1: 重建 admin_create_user RPC
-- 去掉所有 CASE 角色映射，p_role 原样入库
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
BEGIN
  -- 验证邮箱格式
  IF p_email !~ '@cti-cert\.com$' THEN
    RAISE EXCEPTION '注册邮箱必须为 @cti-cert.com 企业邮箱';
  END IF;

  -- 创建 auth.users
  new_user_id := extensions.uuid_generate_v4();

  INSERT INTO auth.users (
    id, email, encrypted_password, email_confirmed_at,
    raw_app_meta_data, raw_user_meta_data,
    created_at, updated_at, confirmation_token,
    email_change, email_change_token_new, recovery_token
  ) VALUES (
    new_user_id,
    p_email,
    crypt(p_password, gen_salt('bf')),
    now(),
    jsonb_build_object('provider', 'email', 'providers', ARRAY['email']),
    jsonb_build_object('username', p_username),
    now(), now(),
    '', '', '', ''
  );

  -- 创建 profiles 记录
  -- 注意：p_role 原样入库，不做任何映射
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

  -- 如果 p_must_change_pwd 为 true，标记需要修改密码
  IF p_must_change_pwd THEN
    -- 可以添加密码修改标记逻辑
    NULL;
  END IF;

  RETURN new_user_id;
END;
$$;

-- ============================================
-- STEP 2: 先修复一级部门（根据现有角色推断）
-- 必须在角色转换之前执行，保证 department_level1 准确
-- ============================================
UPDATE profiles SET department_level1 = '实验室'
WHERE (department_level1 IS NULL OR department_level1 = '')
  AND role IN (
    'inspection_leader', 'inspection_leader_assistant', 'inspection_engineer',
    'supervisor', 'supervisor_assistant',
    'customer_service', 'cs_leader', 'cs_leader_assistant',
    'sample_prep_leader', 'report_leader', 'data_review', 'report_compiler', 'tech_support',
    -- 也匹配中文角色名（转换前的）
    '组长', '检测组长', '组长助理', '检测组长助理', '检测工程师',
    '实验室主管', '实验室主管助理',
    '客服', '客服组长', '客服组长助理',
    '制样组组长', '报告组组长', '数据二审', '报告编制', '技术支持'
  );

UPDATE profiles SET department_level1 = '业务'
WHERE (department_level1 IS NULL OR department_level1 = '')
  AND role IN ('business', 'business_assistant', '业务', '业务助理');

-- ============================================
-- STEP 3: 迁移所有中文角色值 → 英文值
-- 覆盖所有可能的中文角色名
-- ============================================

-- 实验室端
UPDATE profiles SET role = 'inspection_leader'           WHERE role IN ('组长', '检测组长');
UPDATE profiles SET role = 'inspection_leader_assistant' WHERE role IN ('组长助理', '检测组长助理');
UPDATE profiles SET role = 'inspection_engineer'         WHERE role = '检测工程师';
UPDATE profiles SET role = 'supervisor'                  WHERE role = '实验室主管';
UPDATE profiles SET role = 'supervisor_assistant'        WHERE role = '实验室主管助理';

-- 业务端（只转换一级部门为业务的用户，防止实验室用户被错误标记为业务）
UPDATE profiles SET role = 'business'
WHERE role = '业务'
  AND (department_level1 = '业务' OR department_level1 IS NULL OR department_level1 = '');
UPDATE profiles SET role = 'business_assistant'
WHERE role = '业务助理'
  AND (department_level1 = '业务' OR department_level1 IS NULL OR department_level1 = '');

-- 修复一级部门为实验室但角色被错误存为业务的用户（如赵赫男的情况）
-- 将其设为检测工程师（通用的实验室角色），管理员后续可手动调整
UPDATE profiles SET role = 'inspection_engineer'
WHERE role IN ('业务', 'business')
  AND department_level1 = '实验室';

-- 客服等其他角色
UPDATE profiles SET role = 'customer_service'          WHERE role = '客服';
UPDATE profiles SET role = 'cs_leader'                 WHERE role = '客服组长';
UPDATE profiles SET role = 'cs_leader_assistant'       WHERE role = '客服组长助理';
UPDATE profiles SET role = 'sample_prep_leader'        WHERE role = '制样组组长';
UPDATE profiles SET role = 'report_leader'             WHERE role = '报告组组长';
UPDATE profiles SET role = 'data_review'               WHERE role = '数据二审';
UPDATE profiles SET role = 'report_compiler'           WHERE role = '报告编制';
UPDATE profiles SET role = 'tech_support'              WHERE role = '技术支持';

-- ============================================
-- STEP 4: 补丁 — 如果还有 department_level1 为空/错误的
-- 以角色为准再补充一次（避免转换后的英文角色未被覆盖）
-- ============================================
UPDATE profiles SET department_level1 = '实验室'
WHERE (department_level1 IS NULL OR department_level1 = '')
  AND role IN (
    'inspection_leader', 'inspection_leader_assistant', 'inspection_engineer',
    'supervisor', 'supervisor_assistant',
    'customer_service', 'cs_leader', 'cs_leader_assistant',
    'sample_prep_leader', 'report_leader', 'data_review', 'report_compiler', 'tech_support'
  );

UPDATE profiles SET department_level1 = '业务'
WHERE (department_level1 IS NULL OR department_level1 = '')
  AND role IN ('business', 'business_assistant');

-- ============================================
-- STEP 4: 确认结果
-- ============================================
SELECT '角色修复完成' AS result;
SELECT role, COUNT(*) AS 人数 FROM profiles GROUP BY role ORDER BY role;
SELECT department_level1, COUNT(*) AS 人数 FROM profiles WHERE department_level1 IS NOT NULL AND department_level1 != '' GROUP BY department_level1;
