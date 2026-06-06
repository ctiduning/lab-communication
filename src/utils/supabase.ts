import { createClient, SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@/types/database'

const supabaseUrl: string = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey: string = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables')
}

// 创建 Supabase 客户端实例
export const supabase: SupabaseClient<Database> = createClient<Database>(
  supabaseUrl,
  supabaseAnonKey,
  {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true
    }
  }
)

// 获取服务角色客户端（仅用于管理员操作）
export const getServiceSupabase = (): SupabaseClient<Database> => {
  const serviceRoleKey: string = import.meta.env.VITE_SUPABASE_SERVICE_ROLE_KEY
  if (!serviceRoleKey) {
    throw new Error('Missing Supabase service role key')
  }
  return createClient<Database>(supabaseUrl, serviceRoleKey)
}

export default supabase
