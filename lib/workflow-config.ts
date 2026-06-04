"use client"

export type ConfigOption = {
  id: string
  label: string
  value: string
  active: boolean
}

export type ConfigCategoryKey =
  | "salesGroups"
  | "loanTypes"
  | "depositTypes"
  | "interactionTypes"
  | "interactionPurposes"
  | "interactionResults"
  | "orderStatuses"

export type WorkflowRoleRule = {
  role: string
  scope: string
  actions: string[]
}

export type WorkflowConfig = {
  categories: Record<ConfigCategoryKey, ConfigOption[]>
  roleRules: WorkflowRoleRule[]
  canvasNodes: Array<{ id: string; title: string; role: string; x: number; y: number }>
  canvasEdges: Array<{ from: string; to: string; label: string }>
}

export const workflowConfigStorageKey = "bcrm-workflow-config:v1"

export const defaultWorkflowConfig: WorkflowConfig = {
  categories: {
    salesGroups: [
      { id: "sg-loan", label: "Khoản vay", value: "LOAN", active: true },
      { id: "sg-deposit", label: "Tiền gửi", value: "DEPOSIT", active: true },
      { id: "sg-product", label: "Sản phẩm khác", value: "PRODUCT", active: true },
      { id: "sg-project", label: "Dự án", value: "PROJECT", active: true },
    ],
    loanTypes: [
      { id: "loan-working-capital", label: "Vay bổ sung vốn lưu động", value: "Vay bổ sung vốn lưu động", active: true },
      { id: "loan-project", label: "Vay đầu tư dự án", value: "Vay đầu tư dự án", active: true },
      { id: "loan-limit", label: "Cấp mới hạn mức tín dụng", value: "Cấp mới hạn mức tín dụng", active: true },
      { id: "loan-trade", label: "Cho vay tài trợ thương mại", value: "Cho vay tài trợ thương mại", active: true },
      { id: "loan-house", label: "Vay mua nhà", value: "Vay mua nhà", active: true },
    ],
    depositTypes: [
      { id: "dep-term", label: "Tiết kiệm có kỳ hạn", value: "Tiết kiệm có kỳ hạn", active: true },
      { id: "dep-current", label: "Tiền gửi thanh toán", value: "Tiền gửi thanh toán", active: true },
      { id: "dep-normal", label: "Tiết kiệm thường", value: "Tiết kiệm thường", active: true },
    ],
    interactionTypes: [
      { id: "it-call", label: "Gọi điện", value: "CALL", active: true },
      { id: "it-meeting", label: "Gặp mặt", value: "MEETING", active: true },
      { id: "it-email", label: "Email", value: "EMAIL", active: true },
      { id: "it-sms", label: "SMS", value: "SMS", active: true },
      { id: "it-visit", label: "Thăm khách hàng", value: "VISIT", active: true },
    ],
    interactionPurposes: [
      { id: "ip-loan-consult", label: "Tư vấn khoản vay", value: "Tư vấn khoản vay", active: true },
      { id: "ip-cross-sell", label: "Bán chéo sản phẩm", value: "Bán chéo sản phẩm", active: true },
      { id: "ip-follow-up", label: "Chăm sóc sau bán", value: "Chăm sóc sau bán", active: true },
      { id: "ip-docs", label: "Bổ sung hồ sơ", value: "Bổ sung hồ sơ", active: true },
    ],
    interactionResults: [
      { id: "ir-success", label: "Thành công", value: "SUCCESS", active: true },
      { id: "ir-follow-up", label: "Theo dõi tiếp", value: "FOLLOW_UP", active: true },
      { id: "ir-pending", label: "Đang chờ", value: "PENDING", active: true },
      { id: "ir-no-answer", label: "Không nghe máy", value: "NO_ANSWER", active: true },
      { id: "ir-not-interested", label: "Không quan tâm", value: "NOT_INTERESTED", active: true },
    ],
    orderStatuses: [
      { id: "os-active", label: "Đang hoạt động", value: "ACTIVE", active: true },
      { id: "os-pending", label: "Chờ xử lý", value: "PENDING", active: true },
      { id: "os-completed", label: "Thành công", value: "COMPLETED", active: true },
      { id: "os-interested", label: "Quan tâm", value: "INTERESTED", active: true },
    ],
  },
  roleRules: [
    { role: "ADMIN_LEVEL_0", scope: "Toàn hệ thống", actions: ["Cấu hình droplist", "Thiết kế workflow canvas", "Cấu hình quyền role", "Không can thiệp nội dung dự án cụ thể"] },
    { role: "ADMIN_LEVEL_1", scope: "Toàn hệ thống nghiệp vụ", actions: ["Xem toàn bộ dữ liệu", "Duyệt/xuất bản mẫu", "Xem báo cáo tổng hợp", "Điều chỉnh chính sách vận hành"] },
    { role: "ADMIN_LEVEL_2", scope: "Phòng/chi nhánh quản lý", actions: ["Xem user phòng mình", "Sửa giao dịch/user thuộc phòng", "Duyệt cấu trúc template", "Phân công xử lý"] },
    { role: "USER", scope: "Dữ liệu được giao", actions: ["Tạo tương tác", "Tạo giao dịch bán", "Cập nhật công việc cá nhân"] },
  ],
  canvasNodes: [
    { id: "n-user", title: "User bán hàng phòng A", role: "USER", x: 60, y: 110 },
    { id: "n-lv2", title: "Admin LV2 phòng A", role: "ADMIN_LEVEL_2", x: 330, y: 70 },
    { id: "n-lv1", title: "Admin LV1", role: "ADMIN_LEVEL_1", x: 610, y: 110 },
    { id: "n-lv0", title: "Admin LV0 cấu hình chung", role: "ADMIN_LEVEL_0", x: 330, y: 250 },
  ],
  canvasEdges: [
    { from: "n-user", to: "n-lv2", label: "Dữ liệu phòng A" },
    { from: "n-lv2", to: "n-lv1", label: "Báo cáo/duyệt cấp cao" },
    { from: "n-lv0", to: "n-user", label: "Droplist và workflow chung" },
  ],
}

export function getWorkflowConfig(): WorkflowConfig {
  if (typeof window === "undefined") return defaultWorkflowConfig
  try {
    const raw = window.localStorage.getItem(workflowConfigStorageKey)
    if (!raw) return defaultWorkflowConfig
    const parsed = JSON.parse(raw) as WorkflowConfig
    return {
      ...defaultWorkflowConfig,
      ...parsed,
      categories: { ...defaultWorkflowConfig.categories, ...(parsed.categories || {}) },
    }
  } catch {
    return defaultWorkflowConfig
  }
}

export function saveWorkflowConfig(config: WorkflowConfig) {
  window.localStorage.setItem(workflowConfigStorageKey, JSON.stringify(config))
  window.dispatchEvent(new StorageEvent("storage", { key: workflowConfigStorageKey }))
}

export function getActiveOptions(key: ConfigCategoryKey) {
  return getWorkflowConfig().categories[key].filter((option) => option.active)
}
