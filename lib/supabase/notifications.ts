import { getSupabase } from './client'
import type { TablesInsert } from '@/types/database'

export async function fetchNotifications(userId: string): Promise<any> {
  const supabase = getSupabase()
  const { data, error } = await supabase
    .from('notifications')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(50)
  if (error) throw error
  return data || []
}

export async function createNotification(notification: {
  user_id: string
  title: string
  message: string
  type?: string
  link_url?: string
}): Promise<any> {
  const supabase = getSupabase()
  const { data, error } = await supabase
    .from('notifications')
    .insert(notification as TablesInsert<'notifications'>)
    .select()
    .single()
  if (error) throw error
  return data
}

export async function markNotificationRead(id: string) {
  const supabase = getSupabase()
  const { error } = await supabase
    .from('notifications')
    .update({ is_read: true })
    .eq('id', id)
  if (error) throw error
}

export async function markAllNotificationsRead(userId: string) {
  const supabase = getSupabase()
  const { error } = await supabase
    .from('notifications')
    .update({ is_read: true })
    .eq('user_id', userId)
    .eq('is_read', false)
  if (error) throw error
}
