import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://qgoqhjwekairknkuqisi.supabase.co'
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'sb_publishable_rWISgrBqXWH0qeCnCzYCWQ_atG0teni'

export const supabase = createClient(supabaseUrl, supabaseKey)
