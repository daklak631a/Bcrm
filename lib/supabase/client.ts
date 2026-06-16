import { createBrowserClient } from '@supabase/ssr'
import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@/types/database'

let supabaseClient: SupabaseClient<Database> | null = null

export const getSupabase = (): SupabaseClient<Database> => {
  if (!supabaseClient) {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

    if (!supabaseUrl || !supabaseAnonKey) {
      throw new Error('Thiếu NEXT_PUBLIC_SUPABASE_URL hoặc NEXT_PUBLIC_SUPABASE_ANON_KEY. Không khởi tạo Supabase bằng dữ liệu giả.')
    }

    supabaseClient = createBrowserClient<Database>(supabaseUrl, supabaseAnonKey)
  }
  return supabaseClient
}
