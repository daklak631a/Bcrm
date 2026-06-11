import { getSupabase } from './client'
import { getErrorMessage } from '@/lib/errors'
import { logger } from '@/lib/logger'

export type AuditAction = 'CREATE' | 'UPDATE' | 'DELETE' | 'LOGIN' | 'LOGOUT'
export type EntityType = 'CUSTOMER' | 'LOAN' | 'DEPOSIT' | 'INTERACTION' | 'PRODUCT' | 'CROSS_SALE' | 'AUTH' | 'USER' | 'PLAN'

export interface AuditLogPayload {
  action: AuditAction
  entityType: EntityType
  entityId: string
  beforeValue?: any
  afterValue?: any
}

export async function logAudit(payload: AuditLogPayload) {
  try {
    const supabase = getSupabase()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const { error } = await supabase
      .from('audit_logs')
      .insert({
        user_id: user.id,
        action: payload.action,
        entity_type: payload.entityType,
        entity_id: payload.entityId,
        before_value: payload.beforeValue,
        after_value: payload.afterValue
      })

    if (error) {
      logger.error(
        '[Supabase API] Failed to write audit log',
        { error: getErrorMessage(error) },
        { production: true }
      )
    } else {
      // Create notification for Admins
      let msg = ''
      switch (payload.entityType) {
        case 'CUSTOMER': msg = 'khách hàng'; break;
        case 'LOAN': msg = 'khoản vay'; break;
        case 'DEPOSIT': msg = 'huy động'; break;
        case 'INTERACTION': msg = 'tương tác'; break;
        case 'PLAN': msg = 'chỉ tiêu KPI'; break;
        default: msg = 'dữ liệu';
      }

      let actionMsg = ''
      switch (payload.action) {
        case 'CREATE': actionMsg = 'Thêm mới'; break;
        case 'UPDATE': actionMsg = 'Cập nhật'; break;
        case 'DELETE': actionMsg = 'Xóa'; break;
      }

      if (actionMsg && msg) {
        const { data: admins } = await supabase
          .from('profiles')
          .select('id')
          .in('role', ['ADMIN_LEVEL_1', 'ADMIN_LEVEL_2'])

        if (admins && admins.length > 0) {
          const notifications = admins.map((admin: any) => ({
            user_id: admin.id,
            title: 'Hệ thống',
            message: `${user.email} vừa ${actionMsg.toLowerCase()} ${msg} mới.`,
            type: 'SYSTEM',
            link_url: '/audit-logs'
          }))

          await supabase.from('notifications').insert(notifications)
        }
      }
    }
  } catch (error) {
    logger.error(
      '[Supabase API] Audit log exception',
      { error: getErrorMessage(error) },
      { production: true }
    )
  }
}

export async function fetchAuditLogs(limit = 100): Promise<any> {
  const supabase = getSupabase()
  const { data, error } = await supabase
    .from('audit_logs')
    .select('*, profiles:user_id(id, full_name, email)')
    .order('created_at', { ascending: false })
    .limit(limit)
  if (error) throw error
  return data || []
}
