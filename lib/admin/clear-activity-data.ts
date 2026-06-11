/** Cụm localStorage cho module Dự án / Kanban pilot (xóa phía browser sau khi clear DB). */
export const PILOT_LOCAL_STORAGE_KEYS = [
  'bcrm-advanced-workflow-pilot:v1',
  'bcrm-advanced-workflow-template-admin:v1',
] as const

export const CLEAR_ACTIVITY_CONFIRM_PHRASE = 'XOA LICH SU'

export const CLEAR_ACTIVITY_TARGETS = [
  { key: 'interactions', label: 'Lịch sử tương tác' },
  { key: 'cross_sell_records', label: 'Bán hàng / cross-sell records' },
  { key: 'cross_sales', label: 'Ghi nhận bán hàng (cross_sales)' },
  { key: 'support_requests', label: 'Kanban hỗ trợ bán hàng' },
  { key: 'plans', label: 'Kế hoạch / dự án (plans)' },
  { key: 'plan_assignments', label: 'Phân công kế hoạch' },
  { key: 'weekly_plans', label: 'Kế hoạch tuần' },
  { key: 'daily_plans', label: 'Kế hoạch ngày' },
  { key: 'notifications', label: 'Thông báo' },
  { key: 'daily_manager_snapshots', label: 'Snapshot KPI quản lý' },
  { key: 'manager_transfer_requests', label: 'Yêu cầu chuyển quản lý KH' },
  { key: 'audit_logs', label: 'Nhật ký audit' },
] as const

export const CLEAR_ACTIVITY_KEPT = [
  'Danh sách khách hàng (customers)',
  'Khoản vay & tiền gửi (loans, deposits)',
  'Tài khoản người dùng (profiles)',
  'Danh mục sản phẩm (cross_sell_products)',
  'Cấu hình hệ thống (system_settings, workflow_configs)',
] as const

export function clearPilotLocalStorage() {
  if (typeof window === 'undefined') return
  for (const key of PILOT_LOCAL_STORAGE_KEYS) {
    window.localStorage.removeItem(key)
  }
}
