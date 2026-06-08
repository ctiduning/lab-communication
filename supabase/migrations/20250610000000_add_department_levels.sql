-- ==========================================
-- QDCTI 通讯录三级部门架构重构
-- 执行日期：2025-06-10
-- ==========================================

-- 1. profiles 表新增三级部门字段
ALTER TABLE profiles 
  ADD COLUMN IF NOT EXISTS department_level1 TEXT DEFAULT NULL,  -- 一级部门：业务 / 实验室
  ADD COLUMN IF NOT EXISTS department_level2 TEXT DEFAULT NULL,  -- 二级部门：食品产品线 / 青岛食品企业实验室 等
  ADD COLUMN IF NOT EXISTS department_level3 TEXT DEFAULT NULL;  -- 三级部门：企业气相组 / 青岛 等

-- 2. communications 表新增部门名片字段（存储部门名片对应的负责人ID数组）
ALTER TABLE communications 
  ADD COLUMN IF NOT EXISTS department_card_ids TEXT[] DEFAULT NULL;

-- 3. 数据迁移：将旧字段映射到新字段
-- 3.1 先处理实验室端（根据 role 判断）
UPDATE profiles 
SET 
  department_level1 = '实验室',
  department_level2 = CASE 
    WHEN department LIKE '%企业%' THEN '青岛食品企业实验室'
    WHEN department LIKE '%食品%' AND department NOT LIKE '%企业%' THEN '青岛食品实验室'
    WHEN department LIKE '%大客户%' THEN '青岛大客户实验室'
    ELSE COALESCE(department, '')
  END,
  department_level3 = COALESCE(region, '')
WHERE role IN (
  'supervisor', 'supervisor_assistant', 'customer_service',
  'cs_leader', 'cs_leader_assistant',
  'inspection_leader', 'inspection_leader_assistant', 'inspection_engineer',
  'sample_prep_leader', 'report_leader', 'data_review', 'report_compiler', 'tech_support'
)
AND department_level1 IS NULL;

-- 3.2 处理业务端
UPDATE profiles 
SET 
  department_level1 = '业务',
  department_level2 = CASE 
    WHEN department LIKE '%食品%' THEN '食品产品线'
    WHEN department LIKE '%特食%' OR department LIKE '%日化%' THEN '特食及日化产品线'
    WHEN department LIKE '%饲料%' THEN '饲料产品线'
    WHEN department LIKE '%农产品%' THEN '农产品产品线'
    ELSE COALESCE(department, '其他产品线')
  END,
  department_level3 = COALESCE(region, '')
WHERE role IN ('business', 'business_assistant')
AND department_level1 IS NULL;

-- 4. 创建索引（加速查询）
CREATE INDEX IF NOT EXISTS idx_profiles_department_level1 ON profiles(department_level1);
CREATE INDEX IF NOT EXISTS idx_profiles_department_level2 ON profiles(department_level2);
CREATE INDEX IF NOT EXISTS idx_profiles_department_level3 ON profiles(department_level3);

-- 5. 创建数据库函数：获取部门名片列表（供前端调用）
-- 返回每个三级部门下，同时有组长+组长助理的部门名片信息
CREATE OR REPLACE FUNCTION get_department_cards()
RETURNS TABLE (
  department_level3 TEXT,
  leader_id UUID,
  leader_name TEXT,
  leader_assistant_id UUID,
  leader_assistant_name TEXT
) 
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    p1.department_level3,
    p1.id AS leader_id,
    p1.name AS leader_name,
    p2.id AS leader_assistant_id,
    p2.name AS leader_assistant_name
  FROM profiles p1
  LEFT JOIN profiles p2 
    ON p1.department_level3 = p2.department_level3
    AND p2.role = 'inspection_leader_assistant'
    AND p2.is_disabled = false
  WHERE p1.role = 'inspection_leader'
    AND p1.is_disabled = false
    AND p1.department_level1 = '实验室'
    AND p1.department_level3 IS NOT NULL
    AND p1.department_level3 != '';
END;
$$;

-- 6. 创建数据库函数：回复消息（处理部门名片场景）
-- 任一负责人回复后，另一人状态同步
CREATE OR REPLACE FUNCTION reply_with_department_sync(
  p_communication_id UUID,
  p_reply_content TEXT,
  p_replier_id UUID
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_already_replied BOOLEAN;
BEGIN
  -- 检查是否已有回复
  SELECT EXISTS (
    SELECT 1 FROM replies 
    WHERE communication_id = p_communication_id
    LIMIT 1
  ) INTO v_already_replied;

  -- 如果已有回复，只插入新回复，不更新状态（取第一个回复内容）
  IF v_already_replied THEN
    INSERT INTO replies (communication_id, sender_id, content)
    VALUES (p_communication_id, p_replier_id, p_reply_content);
  ELSE
    -- 第一条回复：插入回复 + 更新 communication_recipients 的 has_replied
    INSERT INTO replies (communication_id, sender_id, content)
    VALUES (p_communication_id, p_replier_id, p_reply_content);

    -- 标记所有接收人为已回复（部门名片场景：两人都标记为已回复）
    UPDATE communication_recipients
    SET has_replied = true
    WHERE communication_id = p_communication_id;
  END IF;
END;
$$;
