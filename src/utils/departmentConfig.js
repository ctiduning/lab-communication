// ============================================
// 三级部门架构配置（最终版）
// ============================================

// 一级部门列表
export const DEPARTMENT_LEVEL1 = ['业务', '实验室']

// 业务端二级部门
export const BUSINESS_LEVEL2 = [
  { value: '食品产品线', label: '食品产品线' },
  { value: '特食及日化产品线', label: '特食及日化产品线' },
  { value: '饲料产品线', label: '饲料产品线' },
  { value: '农产品产品线', label: '农产品产品线' },
  { value: '其他产品线', label: '其他产品线' }
]

// 实验室端二级部门
export const LAB_LEVEL2 = [
  { value: '青岛食品实验室', label: '青岛食品实验室' },
  { value: '青岛食品大客户实验室', label: '青岛食品大客户实验室' }
]

// 实验室端三级部门
export const LAB_LEVEL3 = [
  { value: '企业气相组', label: '企业气相组' },
  { value: '企业液相组', label: '企业液相组' },
  { value: '政府气相组', label: '政府气相组' },
  { value: '政府液相组', label: '政府液相组' },
  { value: '综合组', label: '综合组' },
  { value: '理化组', label: '理化组' },
  { value: '营养标签组', label: '营养标签组' },
  { value: '包材组', label: '包材组' },
  { value: '分子生物组', label: '分子生物组' },
  { value: '元素组', label: '元素组' },
  { value: '微生物组', label: '微生物组' },
  { value: '标签审核组', label: '标签审核组' },
  { value: '放射性检测组', label: '放射性检测组' },
  { value: '客服组', label: '客服组' },
  { value: '制样组', label: '制样组' },
  { value: '报告组', label: '报告组' }
]

// 业务端角色（使用英文 value，与 ROLE_OPTIONS 一致）
export const BUSINESS_ROLES = [
  { value: 'business', label: '业务' },
  { value: 'business_assistant', label: '业务助理' }
]

// 实验室端角色（使用英文 value，与 ROLE_OPTIONS 一致）
export const LAB_ROLES = [
  { value: 'supervisor', label: '实验室主管' },
  { value: 'supervisor_assistant', label: '实验室主管助理' },
  { value: 'inspection_leader', label: '检测组长' },
  { value: 'inspection_leader_assistant', label: '检测组长助理' },
  { value: 'inspection_engineer', label: '检测工程师' }
]

// 获取二级部门选项
export function getLevel2Options(level1) {
  if (level1 === '业务') return BUSINESS_LEVEL2
  if (level1 === '实验室') return LAB_LEVEL2
  return []
}

// 获取三级部门选项
export function getLevel3Options(level1) {
  if (level1 === '业务') return [] // 业务端手动填写
  if (level1 === '实验室') return LAB_LEVEL3
  return []
}

// 获取角色选项
export function getRoleOptions(level1) {
  if (level1 === '业务') return BUSINESS_ROLES
  if (level1 === '实验室') return LAB_ROLES
  return []
}

// 业务端三级部门是手动输入（属地）
export function isLevel3ManualInput(level1) {
  return level1 === '业务'
}

// 部门名片角色（组长 + 组长助理）
export const DEPARTMENT_CARD_ROLES = ['inspection_leader', 'inspection_leader_assistant']

// 判断是否是部门名片角色
export function isDepartmentCardRole(role) {
  return DEPARTMENT_CARD_ROLES.includes(role)
}

// 获取某三级部门的所有名片持有人（检测组长/检测组长助理）
export function getDepartmentCardHolders(level3, allUsers) {
  return allUsers.filter(u =>
    u.departmentLevel3 === level3 &&
    isDepartmentCardRole(u.role) &&
    !u.isDisabled
  )
}
