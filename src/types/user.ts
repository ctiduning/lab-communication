/**
 * 用户相关类型定义
 */

/** 用户角色枚举 */
export enum UserRole {
  LEADER = 'leader',
  MEMBER = 'member',
  ADMIN = 'admin'
}

/** 用户类型 */
export enum UserType {
  BUSINESS = 'business',
  LABORATORY = 'laboratory',
  ADMIN = 'admin'
}

/** 用户优先级策略 */
export enum PriorityStrategy {
  LEADER_FIRST = 'leader_first',
  MEMBER_BACKUP = 'member_backup'
}

/** 用户区域（业务端） */
export type UserRegion = '北区' | '东区' | '南区' | '西区' | '东北区'

/** 一级部门 */
export type DepartmentLevel1 = '业务' | '实验室'

/** 二级部门 - 业务端 */
export type BizDepartmentL2 = 
  | '食品产品线' 
  | '特食及日化产品线' 
  | '饲料产品线' 
  | '农产品产品线' 
  | '其他产品线'

/** 二级部门 - 实验室端 */
export type LabDepartmentL2 = 
  | '青岛食品企业实验室'
  | '青岛食品实验室'
  | '青岛大客户实验室'

/** 三级部门 - 实验室端（16个组） */
export type LabDepartmentL3 =
  | '企业气相组'
  | '企业液相组'
  | '政府气相组'
  | '政府液相组'
  | '综合组'
  | '理化组'
  | '营养标签组'
  | '包材组'
  | '分子生物组'
  | '元素组'
  | '微生物组'
  | '标签审核组'
  | '放射性检测组'
  | '客服组'
  | '制样组'
  | '报告组'

/** 实验室部门 */
export type LabDepartment = '化学部' | '物理部' | '生物部' | '综合部'

/** 用户数据结构 */
export interface User {
  id: string
  username?: string
  name: string
  employee_id: string
  phone: string
  email: string
  // 旧字段（保留兼容）
  region?: UserRegion | string
  department?: LabDepartment | string
  // 新字段：三级部门架构
  department_level1?: DepartmentLevel1 | string
  department_level2?: BizDepartmentL2 | LabDepartmentL2 | string
  department_level3?: LabDepartmentL3 | string
  priority: PriorityStrategy
  role: UserRole
  user_type: UserType
  is_disabled?: boolean
  must_change_password?: boolean
  last_active_at?: string
  last_sign_in_at?: string
  created_at: string
  updated_at: string
}

/** 用户注册表单 */
export interface UserRegisterForm {
  name: string
  employee_id: string
  phone: string
  email: string
  password: string
  confirm_password: string
  region?: UserRegion
  department?: LabDepartment
  priority: PriorityStrategy
  role: UserRole
  user_type: UserType
}

/** 用户登录表单 */
export interface UserLoginForm {
  employee_id: string
  password: string
}

/** 用户状态 */
export interface UserState {
  currentUser: User | null
  isAuthenticated: boolean
  loading: boolean
}
