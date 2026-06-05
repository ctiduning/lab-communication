import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://qgoqhjwekairknkuqisi.supabase.co'
const supabaseKey = 'sb_publishable_rWISgrBqXWH0qeCnCzYCWQ_atG0teni'

export const supabase = createClient(supabaseUrl, supabaseKey)
