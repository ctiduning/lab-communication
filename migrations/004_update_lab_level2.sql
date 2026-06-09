-- ============================================
-- Migration 004: 更新实验室二级部门配置
-- 日期: 2026-06-09
-- 说明: 删除"青岛食品企业实验室"，重命名"青岛大客户实验室"
--       为"青岛食品大客户实验室"
-- ============================================

-- 1. 青岛食品企业实验室 → 合并到青岛食品实验室
UPDATE profiles
SET department_level2 = '青岛食品实验室'
WHERE department_level2 = '青岛食品企业实验室';

-- 2. 青岛大客户实验室 → 重命名为青岛食品大客户实验室
UPDATE profiles
SET department_level2 = '青岛食品大客户实验室'
WHERE department_level2 = '青岛大客户实验室';

-- 3. 确认结果
SELECT department_level2, COUNT(*) AS count
FROM profiles
WHERE department_level1 = '实验室'
GROUP BY department_level2
ORDER BY department_level2;
