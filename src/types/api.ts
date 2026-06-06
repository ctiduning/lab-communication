/**
 * API 响应类型定义
 */

/** 标准 API 响应格式 */
export interface ApiResponse<T = unknown> {
  code: number
  data: T
  message: string
}

/** 分页请求参数 */
export interface PaginationParams {
  page: number
  pageSize: number
}

/** 分页响应 */
export interface PaginatedResponse<T> {
  items: T[]
  total: number
  page: number
  pageSize: number
}

/** 错误响应 */
export interface ErrorResponse {
  code: number
  message: string
  details?: string
}

/** 常用响应类型别名 */
export type UserResponse = ApiResponse<User>
export type MessageResponse = ApiResponse<Message>
export type ReplyResponse = ApiResponse<Reply>
export type UsersResponse = ApiResponse<PaginatedResponse<User>>
export type MessagesResponse = ApiResponse<PaginatedResponse<Message>>
export type RepliesResponse = ApiResponse<Reply[]>

/** 认证响应 */
export interface AuthResponse {
  user: User
  session: {
    access_token: string
    refresh_token: string
    expires_at: number
  }
}
