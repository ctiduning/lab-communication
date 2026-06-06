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

/** 实验室部门 */
export type LabDepartment = '化学部' | '物理部' | '生物部' | '综合部'

/** 用户数据结构 */
export interface User {
  id: string
  name: string
  employee_id: string
  phone: string
  email: string
  region?: UserRegion
  department?: LabDepartment
  priority: PriorityStrategy
  role: UserRole
  user_type: UserType
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
