import { getSupabase } from './client'
import { ManagerTransferRequest } from '@/types/models'

export async function createTransferRequest(
  customerId: string,
  targetManagerId: string,
  reason: string
): Promise<any> {
  const supabase = getSupabase()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')

  const transferRequest = {
    customer_id: customerId,
    requester_id: user.id,
    target_manager_id: targetManagerId,
    status: 'PENDING' as const,
    reason
  }

  const { data, error } = await supabase
    .from('manager_transfer_requests')
    .insert(transferRequest)
    .select()
    .single()

  if (error) throw error

  // Create notification for target manager and admins
  const { data: customer } = await supabase
    .from('customers')
    .select('full_name')
    .eq('id', customerId)
    .single()

  const customerName = customer ? customer.full_name : 'khách hàng'

  // Admin and Target notifications
  const { data: admins } = await supabase
    .from('profiles')
    .select('id')
    .in('role', ['ADMIN_LEVEL_1', 'ADMIN_LEVEL_2'])

  const notifications = [
    {
      user_id: targetManagerId,
      title: 'Đề xuất nhận bàn giao khách hàng',
      message: `Bạn được đề xuất làm chuyên viên quản lý cho khách hàng ${customerName}.`,
      type: 'SYSTEM',
      link_url: `/customers/${customerId}`
    }
  ]

  if (admins && admins.length > 0) {
    admins.forEach((admin: any) => {
      if (admin.id !== targetManagerId) {
        notifications.push({
          user_id: admin.id,
          title: 'Yêu cầu chuyển giao khách hàng',
          message: `Có yêu cầu chuyển giao khách hàng ${customerName} đang chờ phê duyệt.`,
          type: 'SYSTEM',
          link_url: `/customers/${customerId}`
        })
      }
    })
  }

  await supabase.from('notifications').insert(notifications)

  return data
}

export async function fetchTransferRequests(): Promise<any> {
  const supabase = getSupabase()
  const { data, error } = await supabase
    .from('manager_transfer_requests')
    .select(`
      *,
      customer:customer_id(id, full_name),
      requester:requester_id(id, full_name, email),
      target_manager:target_manager_id(id, full_name, email)
    `)
    .order('created_at', { ascending: false })

  if (error) throw error
  return (data || []) as ManagerTransferRequest[]
}

export async function updateTransferRequestStatus(
  requestId: string,
  status: 'APPROVED' | 'REJECTED'
): Promise<any> {
  const supabase = getSupabase()
  const { data, error } = await supabase
    .from('manager_transfer_requests')
    .update({ status, updated_at: new Date().toISOString() })
    .eq('id', requestId)
    .eq('status', 'PENDING')
    .select(`
      *,
      customer:customer_id(id, full_name),
      requester:requester_id(id, full_name, email),
      target_manager:target_manager_id(id, full_name, email)
    `)
    .single()

  if (error) throw error

  const customerName = data.customer ? data.customer.full_name : 'khách hàng'

  // Log interaction if approved
  if (status === 'APPROVED') {
    const { error: customerUpdateError } = await supabase
      .from('customers')
      .update({
        assigned_manager_id: data.target_manager_id,
        updated_at: new Date().toISOString(),
      })
      .eq('id', data.customer_id)

    if (customerUpdateError) throw customerUpdateError

    await supabase.from('interactions').insert({
      customer_id: data.customer_id,
      manager_id: data.target_manager_id,
      type: 'CALL',
      purpose: 'BÀN GIAO QUẢN LÝ',
      notes: `Hệ thống: Khách hàng được chuyển giao quản lý từ ${data.requester.full_name} (${data.requester.email}) sang ${data.target_manager.full_name} (${data.target_manager.email}). Lý do: ${data.reason || 'Không có'}`,
      interaction_date: new Date().toISOString().split('T')[0],
      completion_status: true,
      result: 'SUCCESS'
    })
  }

  // Notify requester and target manager of result
  const notifications = [
    {
      user_id: data.requester_id,
      title: 'Kết quả yêu cầu chuyển giao',
      message: `Yêu cầu chuyển giao khách hàng ${customerName} đã được ${status === 'APPROVED' ? 'Phê duyệt' : 'Từ chối'}.`,
      type: 'SYSTEM',
      link_url: `/customers/${data.customer_id}`
    },
    {
      user_id: data.target_manager_id,
      title: 'Kết quả chuyển giao khách hàng',
      message: `Chuyển giao khách hàng ${customerName} sang cho bạn đã được ${status === 'APPROVED' ? 'Phê duyệt' : 'Từ chối'}.`,
      type: 'SYSTEM',
      link_url: `/customers/${data.customer_id}`
    }
  ]

  await supabase.from('notifications').insert(notifications)

  return data
}
