/**
 * 回复相关类型定义
 */

/** 回复数据结构 */
export interface Reply {
  id: string
  message_id: string
  sender_id: string
  sender_name?: string
  content: string
  created_at: string
  updated_at: string
}

/** 回复表单 */
export interface ReplyForm {
  message_id: string
  content: string
}

/** 回复状态 */
export interface ReplyState {
  replies: Reply[]
  loading: boolean
}
