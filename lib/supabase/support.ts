import { getSupabase } from './client'
import { getErrorMessage } from '@/lib/errors'
import { logger } from '@/lib/logger'

export async function fetchSupportRequests(): Promise<any> {
  const supabase = getSupabase()
  const { data: { session } } = await supabase.auth.getSession()
  const response = await fetch('/api/support/requests', {
    headers: session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : {},
  })
  const payload = await response.json()
  if (!response.ok) {
    logger.error(
      '[Supabase API] Failed to fetch support requests',
      { error: getErrorMessage(payload.error) },
      { production: true }
    )
    return []
  }
  return payload.data || []
}

export async function createSupportRequest(request: { item_id: string, item_type: string, support_admin_id: string, scheduled_date: string, requester_id?: string }): Promise<any> {
  const supabase = getSupabase()
  const { data: { session } } = await supabase.auth.getSession()
  const response = await fetch('/api/support/requests', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : {}),
    },
    body: JSON.stringify(request),
  })
  const payload = await response.json()
  if (!response.ok) throw new Error(payload.error || 'Không thể tạo yêu cầu hỗ trợ.')
  return payload.data
}

export async function updateSupportRequestStatus(id: string, status: string): Promise<any> {
  const supabase = getSupabase()
  const { data: { session } } = await supabase.auth.getSession()
  const response = await fetch('/api/support/requests', {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      ...(session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : {}),
    },
    body: JSON.stringify({ id, status }),
  })
  const payload = await response.json()
  if (!response.ok) throw new Error(payload.error || 'Không thể cập nhật yêu cầu hỗ trợ.')
  return payload.data
}
