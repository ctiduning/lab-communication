// ============================================
// 三级部门架构配置
// ============================================

// 一级部门列表
export const DEPARTMENT_LEVEL1 = ['业务', '实验室']

// 二级部门映射
export const DEPARTMENT_LEVEL2_MAP = {
  '业务': [
    { value: '业务一部', label: '业务一部' },
    { value: '业务二部', label: '业务二部' },
    { value: '业务三部', label: '业务三部' },
    { value: '业务四部', label: '业务四部' },
    { value: '业务五部', label: '业务五部' }
  ],
  '实验室': [
    { value: '理化实验室', label: '理化实验室' },
    { value: '微生物实验室', label: '微生物实验室' },
    { value: '重金属实验室', label: '重金属实验室' },
    { value: '有机物实验室', label: '有机物实验室' }
  ]
}

// 三级部门映射（仅实验室）
export const DEPARTMENT_LEVEL3_MAP = {
  '理化实验室': [
    { value: '色谱组', label: '色谱组' },
    { value: '光谱组', label: '光谱组' },
    { value: '常规分析组', label: '常规分析组' }
  ],
  '微生物实验室': [
    { value: '细菌组', label: '细菌组' },
    { value: '真菌组', label: '真菌组' }
  ],
  '重金属实验室': [
    { value: '前处理组', label: '前处理组' },
    { value: 'ICP组', label: 'ICP组' }
  ],
  '有机物实验室': [
    { value: 'GC组', label: 'GC组' },
    { value: 'GCMS组', label: 'GCMS组' }
  ]
}

// 部门名片角色（组长 + 组长助理）
export const DEPARTMENT_CARD_ROLES = [
  'inspection_leader',    // 检测组长
  'inspection_leader_assistant', // 检测组长助理
  'cs_leader',        // 客服组长
  'cs_leader_assitant', // 客服组长助理
  'sample_prep_leader', // 制样组组长
  'report_leader'      // 报告组组长
]

// 判断是否是部门名片角色
export function isDepartmentCardRole(role) {
  return DEPARTMENT_CARD_ROLES.includes(role)
}

// 获取某三级部门的所有名片持有人
export function getDepartmentCardHolders(level3, allUsers) {
  return allUsers.filter(u =>
    u.departmentLevel3 === level3 &&
    isDepartmentCardRole(u.role) &&
    !u.isDisabled
  )
}
