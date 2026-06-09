-- ============================================
-- Migration 003: 统一角色值为英文
-- 日期: 2026-06-09
-- 说明: 删除 profiles_role_check 约束，
--       迁移已有的中文角色值为英文值，
--       使前端 ROLE_OPTIONS 和后端一致。
-- ============================================

-- 1. 删除中文角色值约束
ALTER TABLE profiles DROP CONSTRAINT IF EXISTS profiles_role_check;

-- 2. 迁移已有中文角色值 → 英文值
UPDATE profiles SET role = 'supervisor'            WHERE role = '实验室主管';
UPDATE profiles SET role = 'supervisor_assistant'  WHERE role = '实验室主管助理';
UPDATE profiles SET role = 'inspection_leader'     WHERE role = '组长';
UPDATE profiles SET role = 'inspection_leader'     WHERE role = '检测组长';
UPDATE profiles SET role = 'inspection_leader_assistant' WHERE role = '组长助理';
UPDATE profiles SET role = 'inspection_leader_assistant' WHERE role = '检测组长助理';
UPDATE profiles SET role = 'inspection_engineer'   WHERE role = '检测工程师';
UPDATE profiles SET role = 'customer_service'      WHERE role = '客服';
UPDATE profiles SET role = 'cs_leader'             WHERE role = '客服组长';
UPDATE profiles SET role = 'cs_leader_assistant'   WHERE role = '客服组长助理';
UPDATE profiles SET role = 'sample_prep_leader'    WHERE role = '制样组组长';
UPDATE profiles SET role = 'report_leader'         WHERE role = '报告组组长';
UPDATE profiles SET role = 'data_review'           WHERE role = '数据二审';
UPDATE profiles SET role = 'report_compiler'       WHERE role = '报告编制';
UPDATE profiles SET role = 'tech_support'          WHERE role = '技术支持';
UPDATE profiles SET role = 'business'              WHERE role = '业务';
UPDATE profiles SET role = 'business_assistant'    WHERE role = '业务助理';
-- admin 已经是英文，无需迁移

-- 3. 确认迁移结果
SELECT role, COUNT(*) AS count FROM profiles GROUP BY role ORDER BY role;
