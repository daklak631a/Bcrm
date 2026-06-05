"use client"

import { getSupabase } from "@/lib/supabase/client"

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

export type PermissionActionKey =
  | "view"
  | "create"
  | "update"
  | "approve"
  | "assign"
  | "export"
  | "configure"

export type BusinessPermissionGroup = {
  id: string
  title: string
  description: string
  permissions: Record<string, PermissionActionKey[]>
}

export type WorkflowPermissionStep = {
  id: string
  title: string
  role: string
  actions: PermissionActionKey[]
  notes: string[]
}

export type WorkflowPermissionRule = {
  id: string
  workflowName: string
  ownerUnit: string
  description: string
  steps: WorkflowPermissionStep[]
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
  businessPermissions: BusinessPermissionGroup[]
  workflowPermissions: WorkflowPermissionRule[]
  canvasNodes: WorkflowCanvasNode[]
  canvasEdges: WorkflowCanvasEdge[]
}

export type WorkflowConfigStorageMode = "supabase" | "local"

export type WorkflowConfigLoadResult = {
  config: WorkflowConfig
  mode: WorkflowConfigStorageMode
  savedAt?: string
}

export type EffectiveWorkflowPermissionInput = {
  role?: string | null
  workflowId: string
  stepId: string
  action: PermissionActionKey
}

export const workflowConfigStorageKey = "bcrm-workflow-config:v1"
const workflowConfigCacheTtlMs = 5 * 60_000
let workflowConfigMemoryCache: WorkflowConfigLoadResult | null = null
let workflowConfigMemoryCacheExpiresAt = 0

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
  businessPermissions: [
    {
      id: "sales",
      title: "Khối bán hàng",
      description: "Khách hàng, tương tác, bán chéo, sản phẩm và chỉ tiêu bán hàng.",
      permissions: {
        ADMIN_LEVEL_0: ["configure"],
        ADMIN_LEVEL_1: ["view", "approve", "export"],
        ADMIN_LEVEL_2: ["view", "update", "assign", "approve"],
        ADMIN_LEVEL_3: ["view", "update", "assign"],
        USER: ["view", "create", "update"],
        ADVISOR: ["view"],
      },
    },
    {
      id: "credit",
      title: "Khối tín dụng",
      description: "Khoản vay, hồ sơ cấp hạn mức, chuyển giao quản lý và rà soát điều kiện.",
      permissions: {
        ADMIN_LEVEL_0: ["configure"],
        ADMIN_LEVEL_1: ["view", "approve", "export"],
        ADMIN_LEVEL_2: ["view", "update", "approve", "assign"],
        ADMIN_LEVEL_3: ["view", "update"],
        USER: ["view", "create", "update"],
        ADVISOR: ["view"],
      },
    },
    {
      id: "operations",
      title: "Khối vận hành",
      description: "Yêu cầu hỗ trợ, phân công xử lý, template dự án và nhật ký vận hành.",
      permissions: {
        ADMIN_LEVEL_0: ["configure"],
        ADMIN_LEVEL_1: ["view", "approve", "export"],
        ADMIN_LEVEL_2: ["view", "update", "approve", "assign"],
        ADMIN_LEVEL_3: ["view", "update", "assign"],
        USER: ["view", "create", "update"],
        ADVISOR: ["view"],
      },
    },
    {
      id: "governance",
      title: "Khối quản trị hệ thống",
      description: "Droplist, cấu hình workflow, role, audit log và tham số hệ thống.",
      permissions: {
        ADMIN_LEVEL_0: ["view", "update", "configure"],
        ADMIN_LEVEL_1: ["view", "approve", "export"],
        ADMIN_LEVEL_2: ["view"],
        ADMIN_LEVEL_3: [],
        USER: [],
        ADVISOR: ["view"],
      },
    },
  ],
  workflowPermissions: [
    {
      id: "wf-customer-sales",
      workflowName: "Workflow bán hàng khách hàng",
      ownerUnit: "Khối bán hàng",
      description: "Luồng từ tạo tương tác đến cập nhật kết quả bán sản phẩm.",
      steps: [
        { id: "sales-create", title: "Tạo lead/tương tác", role: "USER", actions: ["view", "create", "update"], notes: ["Chỉ thao tác dữ liệu được giao."] },
        { id: "sales-assign", title: "Phân công và giám sát", role: "ADMIN_LEVEL_2", actions: ["view", "update", "assign"], notes: ["Giới hạn trong phòng/chi nhánh quản lý."] },
        { id: "sales-report", title: "Tổng hợp hiệu quả", role: "ADMIN_LEVEL_1", actions: ["view", "export"], notes: ["Xem toàn hệ thống nghiệp vụ."] },
      ],
    },
    {
      id: "wf-credit-review",
      workflowName: "Workflow hồ sơ tín dụng",
      ownerUnit: "Khối tín dụng",
      description: "Luồng tạo hồ sơ vay, rà soát phòng và duyệt cấp nghiệp vụ.",
      steps: [
        { id: "credit-create", title: "Nhập hồ sơ khoản vay", role: "USER", actions: ["view", "create", "update"], notes: ["Không được duyệt hồ sơ của chính mình."] },
        { id: "credit-branch-review", title: "Rà soát cấp phòng", role: "ADMIN_LEVEL_2", actions: ["view", "update", "approve", "assign"], notes: ["Duyệt trong phạm vi phòng/chi nhánh."] },
        { id: "credit-business-approve", title: "Duyệt nghiệp vụ hội sở", role: "ADMIN_LEVEL_1", actions: ["view", "approve", "export"], notes: ["Chỉ duyệt khi bước phòng đã hoàn tất."] },
      ],
    },
    {
      id: "wf-system-config",
      workflowName: "Workflow cấu hình hệ thống",
      ownerUnit: "Khối quản trị hệ thống",
      description: "Luồng thay đổi droplist, template workflow và ma trận quyền.",
      steps: [
        { id: "system-design", title: "Thiết kế cấu hình chung", role: "ADMIN_LEVEL_0", actions: ["view", "update", "configure"], notes: ["Không xử lý nội dung dự án cụ thể."] },
        { id: "system-business-review", title: "Xác nhận chính sách nghiệp vụ", role: "ADMIN_LEVEL_1", actions: ["view", "approve"], notes: ["Xác nhận trước khi áp dụng rộng."] },
        { id: "system-branch-rollout", title: "Áp dụng tại chi nhánh", role: "ADMIN_LEVEL_2", actions: ["view", "assign"], notes: ["Phân công user theo cấu hình đã được duyệt."] },
      ],
    },
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

function normalizeWorkflowConfig(config?: Partial<WorkflowConfig> | null): WorkflowConfig {
  return {
    ...defaultWorkflowConfig,
    ...(config || {}),
    categories: { ...defaultWorkflowConfig.categories, ...(config?.categories || {}) },
    roleRules: Array.isArray(config?.roleRules) && config.roleRules.length ? config.roleRules : defaultWorkflowConfig.roleRules,
    businessPermissions: Array.isArray(config?.businessPermissions) && config.businessPermissions.length ? config.businessPermissions : defaultWorkflowConfig.businessPermissions,
    workflowPermissions: Array.isArray(config?.workflowPermissions) && config.workflowPermissions.length ? config.workflowPermissions : defaultWorkflowConfig.workflowPermissions,
    canvasNodes: normalizeCanvasNodes(config?.canvasNodes),
    canvasEdges: normalizeCanvasEdges(config?.canvasEdges),
  }
}

function cacheWorkflowConfig(config: WorkflowConfig) {
  if (typeof window === "undefined") return
  window.localStorage.setItem(workflowConfigStorageKey, JSON.stringify(config))
  window.dispatchEvent(new StorageEvent("storage", { key: workflowConfigStorageKey }))
}

export function getWorkflowConfig(): WorkflowConfig {
  if (typeof window === "undefined") return defaultWorkflowConfig
  try {
    const raw = window.localStorage.getItem(workflowConfigStorageKey)
    if (!raw) return defaultWorkflowConfig
    const parsed = JSON.parse(raw) as Partial<WorkflowConfig>
    return normalizeWorkflowConfig(parsed)
  } catch {
    return defaultWorkflowConfig
  }
}

export async function loadWorkflowConfig(): Promise<WorkflowConfigLoadResult> {
  const now = Date.now()
  if (workflowConfigMemoryCache && workflowConfigMemoryCacheExpiresAt > now) {
    return workflowConfigMemoryCache
  }

  const localConfig = getWorkflowConfig()

  try {
    const supabase = getSupabase()
    const { data, error } = await supabase
      .from("workflow_configs")
      .select("payload, updated_at")
      .eq("key", workflowConfigStorageKey)
      .maybeSingle()

    if (error) throw error

    if (!data?.payload || Object.keys(data.payload).length === 0) {
      const result: WorkflowConfigLoadResult = { config: localConfig, mode: "local" }
      workflowConfigMemoryCache = result
      workflowConfigMemoryCacheExpiresAt = Date.now() + workflowConfigCacheTtlMs
      return result
    }

    const config = normalizeWorkflowConfig(data.payload as Partial<WorkflowConfig>)
    cacheWorkflowConfig(config)
    const result: WorkflowConfigLoadResult = { config, mode: "supabase", savedAt: data.updated_at }
    workflowConfigMemoryCache = result
    workflowConfigMemoryCacheExpiresAt = Date.now() + workflowConfigCacheTtlMs
    return result
  } catch (error) {
    console.warn("Không đọc được workflow config từ Supabase, dùng localStorage.", error)
    const result: WorkflowConfigLoadResult = { config: localConfig, mode: "local" }
    workflowConfigMemoryCache = result
    workflowConfigMemoryCacheExpiresAt = Date.now() + 60_000
    return result
  }
}

export async function saveWorkflowConfig(config: WorkflowConfig): Promise<WorkflowConfigStorageMode> {
  const normalizedConfig = normalizeWorkflowConfig(config)
  cacheWorkflowConfig(normalizedConfig)
  workflowConfigMemoryCache = { config: normalizedConfig, mode: "local" }
  workflowConfigMemoryCacheExpiresAt = Date.now() + workflowConfigCacheTtlMs

  try {
    const supabase = getSupabase()
    const { data: userResult } = await supabase.auth.getUser()
    const userId = userResult.user?.id || null
    const { error } = await supabase
      .from("workflow_configs")
      .upsert(
        {
          key: workflowConfigStorageKey,
          payload: normalizedConfig,
          updated_by: userId,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "key" }
      )

    if (error) throw error
    workflowConfigMemoryCache = { config: normalizedConfig, mode: "supabase", savedAt: new Date().toISOString() }
    workflowConfigMemoryCacheExpiresAt = Date.now() + workflowConfigCacheTtlMs
    return "supabase"
  } catch (error) {
    console.warn("Không lưu được workflow config lên Supabase, đã lưu localStorage.", error)
    return "local"
  }
}

export function getActiveOptions(key: ConfigCategoryKey) {
  return getWorkflowConfig().categories[key].filter((option) => option.active)
}

export function getBusinessPermissionGroupForWorkflow(
  config: WorkflowConfig,
  workflowRule: Pick<WorkflowPermissionRule, "ownerUnit">
) {
  return config.businessPermissions.find((group) => (
    group.title === workflowRule.ownerUnit
    || group.id === workflowRule.ownerUnit
    || workflowRule.ownerUnit.toLowerCase().includes(group.id.toLowerCase())
  )) || null
}

export function getBusinessActionsForRole(
  config: WorkflowConfig,
  workflowRule: Pick<WorkflowPermissionRule, "ownerUnit">,
  role?: string | null
) {
  if (!role) return []
  const businessGroup = getBusinessPermissionGroupForWorkflow(config, workflowRule)
  return businessGroup?.permissions[role] || []
}

export function getWorkflowRolePresetActions(
  config: WorkflowConfig,
  workflowRule: Pick<WorkflowPermissionRule, "ownerUnit">,
  role?: string | null
) {
  return getBusinessActionsForRole(config, workflowRule, role)
}

export function getEffectiveWorkflowStepActions(
  config: WorkflowConfig,
  workflowId: string,
  stepId: string,
  role?: string | null
) {
  if (!role) return []
  const workflowRule = config.workflowPermissions.find((item) => item.id === workflowId)
  const step = workflowRule?.steps.find((item) => item.id === stepId)
  if (!workflowRule || !step || step.role !== role) return []

  const businessActions = getBusinessActionsForRole(config, workflowRule, role)
  return step.actions.filter((action) => businessActions.includes(action))
}

export function hasWorkflowStepPermission(
  config: WorkflowConfig,
  input: EffectiveWorkflowPermissionInput
) {
  return getEffectiveWorkflowStepActions(config, input.workflowId, input.stepId, input.role).includes(input.action)
}
