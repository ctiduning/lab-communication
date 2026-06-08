/**
 * 消息相关类型定义
 */

import type { UserType } from './user'

/** 消息类型 */
export enum MessageType {
  SAMPLE_SENDING = '送样沟通',
  QUOTATION = '报价沟通',
  TESTING = '检测沟通',
  REPORT = '报告沟通'
}

/** 消息状态 */
export enum MessageStatus {
  PENDING = 'pending',
  PARTIAL_REPLIED = 'partial_replied',
  REPLIED = 'replied',
  COMPLETED = 'completed'
}

/** 消息接收人信息 */
export interface MessageReceiver {
  id: string
  name: string
  user_type: UserType
  department?: string
  region?: string
}

/** 消息内容（JSONB 存储的表单数据） */
export interface MessageContent {
  /** 送样沟通表单 */
  sample_info?: {
    sample_name: string
    sample_quantity: number
    test_items: string[]
    required_date: string
    remarks?: string
  }
  /** 报价沟通表单 */
  quotation_info?: {
    quotation_id: string
    amount: number
    items: Array<{
      name: string
      price: number
    }>
    remarks?: string
  }
  /** 检测沟通表单 */
  testing_info?: {
    test_id: string
    progress: string
    status: string
    remarks?: string
  }
  /** 报告沟通表单 */
  report_info?: {
    report_id: string
    report_type: string
    delivery_method: string
    remarks?: string
  }
}

/** 消息数据结构 */
export interface Message {
  id: string
  sender_id: string
  sender_name?: string
  receiver_ids: string[]
  receiver_names?: string[]
  message_type: MessageType
  title: string
  content: MessageContent
  status: MessageStatus
  is_completed: boolean
  replied_by: string[]
  department_card_ids?: string[]   // 部门名片：负责人ID数组
  created_at: string
  updated_at: string
}

/** 发起沟通表单 */
export interface MessageForm {
  message_type: MessageType
  title: string
  receiver_ids: string[]
  content: MessageContent
}

/** 消息状态 */
export interface MessageState {
  messages: Message[]
  currentMessage: Message | null
  loading: boolean
  unreadCount: number
}
