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

export type WorkflowCanvasBindingSource =
  | ConfigCategoryKey
  | "productUsageResults"
  | "userProductKpi"

export type WorkflowCanvasBinding = {
  id: string
  source: WorkflowCanvasBindingSource
  value: string
  label: string
}

export type WorkflowCanvasNode = {
  id: string
  title: string
  role: string
  x: number
  y: number
  bindings?: WorkflowCanvasBinding[]
}

export type WorkflowCanvasEdge = {
  id: string
  from: string
  to: string
  label: string
}

export type WorkflowConfig = {
  categories: Record<ConfigCategoryKey, ConfigOption[]>
  roleRules: WorkflowRoleRule[]
  canvasNodes: WorkflowCanvasNode[]
  canvasEdges: WorkflowCanvasEdge[]
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
    {
      id: "n-user",
      title: "User bán hàng phòng A",
      role: "USER",
      x: 60,
      y: 120,
      bindings: [
        { id: "bind-user-product", source: "salesGroups", value: "PRODUCT", label: "Giao dịch sản phẩm" },
        { id: "bind-user-product-result", source: "productUsageResults", value: "cross_sell_records.result_value", label: "Kết quả sử dụng sản phẩm" },
      ],
    },
    {
      id: "n-lv2",
      title: "Admin LV2 phòng A",
      role: "ADMIN_LEVEL_2",
      x: 330,
      y: 70,
      bindings: [
        { id: "bind-lv2-follow-up", source: "interactionResults", value: "FOLLOW_UP", label: "Theo dõi tiếp" },
        { id: "bind-lv2-kpi", source: "userProductKpi", value: "department_product_values", label: "KPI sản phẩm theo phòng" },
      ],
    },
    {
      id: "n-lv1",
      title: "Admin LV1",
      role: "ADMIN_LEVEL_1",
      x: 610,
      y: 120,
      bindings: [
        { id: "bind-lv1-completed", source: "orderStatuses", value: "COMPLETED", label: "Đơn hàng thành công" },
        { id: "bind-lv1-product-kpi", source: "userProductKpi", value: "product_values_vs_targets", label: "Kết quả so với chỉ tiêu" },
      ],
    },
    {
      id: "n-lv0",
      title: "Admin LV0 cấu hình chung",
      role: "ADMIN_LEVEL_0",
      x: 330,
      y: 260,
      bindings: [
        { id: "bind-lv0-droplist", source: "salesGroups", value: "PRODUCT", label: "Nhóm bán hàng: sản phẩm" },
        { id: "bind-lv0-status", source: "orderStatuses", value: "COMPLETED", label: "Trạng thái kết quả" },
      ],
    },
  ],
  canvasEdges: [
    { id: "e-user-lv2", from: "n-user", to: "n-lv2", label: "Dữ liệu phòng A" },
    { id: "e-lv2-lv1", from: "n-lv2", to: "n-lv1", label: "Báo cáo/duyệt cấp cao" },
    { id: "e-lv0-user", from: "n-lv0", to: "n-user", label: "Droplist và workflow chung" },
  ],
}

function normalizeCanvasNodes(nodes?: WorkflowCanvasNode[]) {
  const fallbackBindingsById = new Map(defaultWorkflowConfig.canvasNodes.map((node) => [node.id, node.bindings || []]))
  return (nodes?.length ? nodes : defaultWorkflowConfig.canvasNodes).map((node) => ({
    ...node,
    x: Number.isFinite(Number(node.x)) ? Number(node.x) : 0,
    y: Number.isFinite(Number(node.y)) ? Number(node.y) : 0,
    bindings: Array.isArray(node.bindings) ? node.bindings : fallbackBindingsById.get(node.id) || [],
  }))
}

function normalizeCanvasEdges(edges?: Array<WorkflowCanvasEdge | Omit<WorkflowCanvasEdge, "id">>) {
  return (edges?.length ? edges : defaultWorkflowConfig.canvasEdges).map((edge, index) => ({
    ...edge,
    id: "id" in edge && edge.id ? edge.id : `edge-${edge.from}-${edge.to}-${index}`,
  }))
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
      canvasNodes: normalizeCanvasNodes(parsed.canvasNodes),
      canvasEdges: normalizeCanvasEdges(parsed.canvasEdges),
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
