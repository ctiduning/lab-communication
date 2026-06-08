/**
 * 三级部门联动配置
 * 用于 Admin.vue / BusinessInitiate.vue / LabInitiate.vue 的级联选择
 */

// 一级部门选项
export const DEPARTMENT_LEVEL1_OPTIONS = [
  { value: '业务', label: '业务' },
  { value: '实验室', label: '实验室' }
]

// 二级部门选项（按一级部门分组）
export const DEPARTMENT_LEVEL2_MAP = {
  业务: [
    { value: '食品产品线', label: '食品产品线' },
    { value: '特食及日化产品线', label: '特食及日化产品线' },
    { value: '饲料产品线', label: '饲料产品线' },
    { value: '农产品产品线', label: '农产品产品线' },
    { value: '其他产品线', label: '其他产品线' }
  ],
  实验室: [
    { value: '青岛食品企业实验室', label: '青岛食品企业实验室' },
    { value: '青岛食品实验室', label: '青岛食品实验室' },
    { value: '青岛大客户实验室', label: '青岛大客户实验室' }
  ]
}

// 三级部门选项（按二级部门分组，实验室端专用）
export const DEPARTMENT_LEVEL3_MAP = {
  // 青岛食品企业实验室 下属组
  '青岛食品企业实验室': [
    { value: '企业气相组', label: '企业气相组' },
    { value: '企业液相组', label: '企业液相组' }
  ],
  // 青岛食品实验室 下属组
  '青岛食品实验室': [
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
    { value: '放射性检测组', label: '放射性检测组' }
  ],
  // 青岛大客户实验室 下属组
  '青岛大客户实验室': [
    { value: '客服组', label: '客服组' },
    { value: '制样组', label: '制样组' },
    { value: '报告组', label: '报告组' }
  ]
}

// 角色选项（按一级部门分组）
export const ROLE_MAP = {
  业务: [
    { value: 'business', label: '业务' },
    { value: 'business_assistant', label: '业务助理' }
  ],
  实验室: [
    { value: 'supervisor', label: '实验室主管' },
    { value: 'supervisor_assistant', label: '实验室主管助理' },
    { value: 'cs_leader', label: '客服组长' },
    { value: 'cs_leader_assistant', label: '客服组长助理' },
    { value: 'inspection_leader', label: '检测组长' },
    { value: 'inspection_leader_assistant', label: '检测组长助理' },
    { value: 'inspection_engineer', label: '检测工程师' },
    { value: 'sample_prep_leader', label: '制样组组长' },
    { value: 'report_leader', label: '报告组组长' },
    { value: 'data_review', label: '数据二审' },
    { value: 'report_compiler', label: '报告编制' },
    { value: 'tech_support', label: '技术支持' }
  ]
}

// 判断某角色是否参与部门名片（只有组长和组长助理）
export function isDepartmentCardRole(role) {
  return ['inspection_leader', 'inspection_leader_assistant',
          'cs_leader', 'cs_leader_assistant',
          'sample_prep_leader', 'report_leader'].includes(role)
}

// 获取某三级部门的所有部门名片负责人（组长 + 组长助理）
// 返回：{ leader: {id, name}, assistant: {id, name} }[]
export async function getDepartmentCardHolders(supabase, departmentLevel3) {
  const { data, error } = await supabase
    .from('profiles')
    .select('id, name, role, is_disabled')
    .eq('department_level3', departmentLevel3)
    .in('role', ['inspection_leader', 'inspection_leader_assistant',
                   'cs_leader', 'cs_leader_assistant',
                   'sample_prep_leader', 'report_leader'])
    .eq('is_disabled', false)

  if (error || !data) return []

  // 按角色分组：每个部门最多一个 leader 和一个 assistant
  const leaders = data.filter(u => u.role.endsWith('_leader') || u.role === 'sample_prep_leader' || u.role === 'report_leader')
  const assistants = data.filter(u => u.role.endsWith('_assistant'))

  // 返回配对
  return leaders.map(l => ({
    leader: l,
    assistant: assistants.find(a => a.department_level3 === l.department_level3) || null
  }))
}

// 前端用：判断某三级部门是否有部门名片（同时有 leader + assistant）
export function canHaveDepartmentCard(role) {
  return isDepartmentCardRole(role)
}
