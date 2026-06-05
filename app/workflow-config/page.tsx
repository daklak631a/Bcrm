"use client"

import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react"
import clsx from "clsx"
import {
  Background,
  Controls,
  Handle,
  MarkerType,
  MiniMap,
  Position,
  ReactFlow,
  type Edge,
  type Node,
  type NodeChange,
  type NodeProps,
} from "@xyflow/react"
import "@xyflow/react/dist/style.css"
import { Brain, Check, Database, GitBranch, Grip, Layers3, Link2, LockKeyhole, MousePointer2, Plus, Save, ShieldCheck, Trash2, Workflow, X } from "lucide-react"
import { DashboardLayout } from "@/components/layout/DashboardLayout"
import { useAuthStore } from "@/store/useAuthStore"
import {
  ConfigCategoryKey,
  ConfigOption,
  PermissionActionKey,
  WorkflowCanvasBinding,
  WorkflowCanvasBindingSource,
  WorkflowConfig,
  WorkflowConfigStorageMode,
  defaultWorkflowConfig,
  loadWorkflowConfig,
  saveWorkflowConfig,
} from "@/lib/workflow-config"

const categoryLabels: Record<ConfigCategoryKey, string> = {
  salesGroups: "Nhóm bán hàng",
  loanTypes: "Loại khoản vay",
  depositTypes: "Loại tiền gửi",
  interactionTypes: "Loại tương tác",
  interactionPurposes: "Mục đích tương tác",
  interactionResults: "Kết quả tương tác",
  orderStatuses: "Trạng thái đơn hàng",
}

const categoryKeys = Object.keys(categoryLabels) as ConfigCategoryKey[]
const nodeWidth = 210
const nodeHeight = 88
const canvasWidth = 940
const canvasHeight = 430

const roleOptions = ["USER", "ADMIN_LEVEL_3", "ADMIN_LEVEL_2", "ADMIN_LEVEL_1", "ADMIN_LEVEL_0", "ADVISOR"]

const roleLabels: Record<string, string> = {
  ADMIN_LEVEL_0: "Admin LV0",
  ADMIN_LEVEL_1: "Admin LV1",
  ADMIN_LEVEL_2: "Admin LV2",
  ADMIN_LEVEL_3: "Admin LV3",
  USER: "User",
  ADVISOR: "Cố vấn",
}

const permissionActionOptions: Array<{ key: PermissionActionKey; label: string }> = [
  { key: "view", label: "Xem" },
  { key: "create", label: "Tạo" },
  { key: "update", label: "Sửa" },
  { key: "approve", label: "Duyệt" },
  { key: "assign", label: "Phân công" },
  { key: "export", label: "Xuất" },
  { key: "configure", label: "Cấu hình" },
]

const bindingSourceLabels: Record<WorkflowCanvasBindingSource, string> = {
  ...categoryLabels,
  productUsageResults: "Kết quả sử dụng sản phẩm",
  userProductKpi: "KPI sản phẩm người dùng",
}

const productUsageBindings = [
  { source: "productUsageResults" as const, value: "cross_sell_records.result_value", label: "Giá trị kết quả sản phẩm" },
  { source: "productUsageResults" as const, value: "cross_sell_records.status.COMPLETED", label: "Sản phẩm đã hoàn tất" },
  { source: "productUsageResults" as const, value: "cross_sell_records.is_batch_entry", label: "Kết quả ghi theo lô" },
  { source: "productUsageResults" as const, value: "cross_sell_records.is_allocated", label: "Kết quả đã phân bổ khách hàng" },
  { source: "userProductKpi" as const, value: "product_values_vs_targets", label: "Thực hiện so với chỉ tiêu" },
  { source: "userProductKpi" as const, value: "department_product_values", label: "Kết quả sản phẩm theo phòng" },
]

type CanvasMode = "select" | "connect"
type BindingOption = WorkflowCanvasBinding & { groupLabel: string }
type WorkflowFlowNodeData = {
  title: string
  role: string
  bindings: WorkflowCanvasBinding[]
  selected: boolean
  connecting: boolean
} & Record<string, unknown>
type WorkflowFlowNode = Node<WorkflowFlowNodeData, "workflowNode">

function findOpenCanvasPosition(nodes: WorkflowConfig["canvasNodes"]) {
  const columns = [70, 330, 590]
  const rows = [24, 150, 280]
  const slots = rows.flatMap((y) => columns.map((x) => ({ x, y })))

  const isOpen = (slot: { x: number; y: number }) => {
    return !nodes.some((node) => (
      slot.x < node.x + nodeWidth
      && slot.x + nodeWidth > node.x
      && slot.y < node.y + nodeHeight
      && slot.y + nodeHeight > node.y
    ))
  }

  return slots.find(isOpen) || {
    x: Math.max(0, Math.min(canvasWidth - nodeWidth, 80 + (nodes.length % 3) * 240)),
    y: Math.max(0, Math.min(canvasHeight - nodeHeight, 60 + Math.floor(nodes.length / 3) * 120)),
  }
}

export default function WorkflowConfigPage() {
  const { user } = useAuthStore()
  const [mounted, setMounted] = useState(false)
  const [config, setConfig] = useState<WorkflowConfig>(defaultWorkflowConfig)
  const [activeKey, setActiveKey] = useState<ConfigCategoryKey>("salesGroups")
  const [selectedNodeId, setSelectedNodeId] = useState("n-lv0")
  const [selectedEdgeId, setSelectedEdgeId] = useState("")
  const [canvasMode, setCanvasMode] = useState<CanvasMode>("select")
  const [connectFromId, setConnectFromId] = useState("")
  const [edgeLabel, setEdgeLabel] = useState("Luồng dữ liệu")
  const [saveStatus, setSaveStatus] = useState("")
  const [storageMode, setStorageMode] = useState<WorkflowConfigStorageMode>("local")
  const canManage = user?.role === "ADMIN_LEVEL_0"

  useEffect(() => {
    let active = true
    setMounted(true)

    const loadConfig = async () => {
      const result = await loadWorkflowConfig()
      if (!active) return
      setConfig(result.config)
      setStorageMode(result.mode)
      setSelectedNodeId(result.config.canvasNodes.find((node) => node.role === "ADMIN_LEVEL_0")?.id || result.config.canvasNodes[0]?.id || "")
    }

    loadConfig()
    return () => {
      active = false
    }
  }, [])

  const activeOptions = config.categories[activeKey] || []
  const selectedNode = useMemo(() => config.canvasNodes.find((node) => node.id === selectedNodeId), [config.canvasNodes, selectedNodeId])
  const selectedEdge = useMemo(() => config.canvasEdges.find((edge) => edge.id === selectedEdgeId), [config.canvasEdges, selectedEdgeId])
  const flowNodes = useMemo<WorkflowFlowNode[]>(() => config.canvasNodes.map((node) => ({
    id: node.id,
    type: "workflowNode",
    position: { x: node.x, y: node.y },
    data: {
      title: node.title,
      role: node.role,
      bindings: node.bindings || [],
      selected: selectedNodeId === node.id,
      connecting: connectFromId === node.id,
    },
  })), [config.canvasNodes, connectFromId, selectedNodeId])
  const flowEdges = useMemo<Edge[]>(() => config.canvasEdges.map((edge) => ({
    id: edge.id,
    source: edge.from,
    target: edge.to,
    label: edge.label,
    type: "smoothstep",
    animated: selectedEdgeId === edge.id,
    markerEnd: { type: MarkerType.ArrowClosed, color: selectedEdgeId === edge.id ? "#0f172a" : "#006b68" },
    style: {
      stroke: selectedEdgeId === edge.id ? "#0f172a" : "#006b68",
      strokeWidth: selectedEdgeId === edge.id ? 3 : 2,
    },
    labelStyle: { fill: "#334155", fontWeight: 700, fontSize: 11 },
    labelBgStyle: { fill: "#ffffff", stroke: selectedEdgeId === edge.id ? "#0f172a" : "#cbd5e1" },
    labelBgPadding: [8, 5],
    labelBgBorderRadius: 6,
  })), [config.canvasEdges, selectedEdgeId])
  const selectedRoleRule = useMemo(() => {
    if (!selectedNode) return null
    return config.roleRules.find((rule) => rule.role === selectedNode.role) || null
  }, [config.roleRules, selectedNode])

  const bindingOptions = useMemo<BindingOption[]>(() => {
    const categoryBindings = categoryKeys.flatMap((key) =>
      (config.categories[key] || [])
        .filter((option) => option.active)
        .map((option) => ({
          id: `${key}:${option.value}`,
          source: key as WorkflowCanvasBindingSource,
          value: option.value,
          label: option.label,
          groupLabel: categoryLabels[key],
        }))
    )

    return [
      ...categoryBindings,
      ...productUsageBindings.map((item) => ({
        id: `${item.source}:${item.value}`,
        ...item,
        groupLabel: bindingSourceLabels[item.source],
      })),
    ]
  }, [config.categories])

  const updateOptions = (rows: ConfigOption[]) => {
    setConfig((current) => ({
      ...current,
      categories: { ...current.categories, [activeKey]: rows },
    }))
  }

  const toggleBusinessPermission = (groupId: string, role: string, action: PermissionActionKey) => {
    setConfig((current) => ({
      ...current,
      businessPermissions: current.businessPermissions.map((group) => {
        if (group.id !== groupId) return group

        const currentActions = group.permissions[role] || []
        const nextActions = currentActions.includes(action)
          ? currentActions.filter((item) => item !== action)
          : [...currentActions, action]

        return {
          ...group,
          permissions: {
            ...group.permissions,
            [role]: nextActions,
          },
        }
      }),
    }))
  }

  const toggleWorkflowStepAction = (workflowId: string, stepId: string, action: PermissionActionKey) => {
    setConfig((current) => ({
      ...current,
      workflowPermissions: current.workflowPermissions.map((workflowRule) => {
        if (workflowRule.id !== workflowId) return workflowRule

        return {
          ...workflowRule,
          steps: workflowRule.steps.map((step) => {
            if (step.id !== stepId) return step

            const nextActions = step.actions.includes(action)
              ? step.actions.filter((item) => item !== action)
              : [...step.actions, action]

            return { ...step, actions: nextActions }
          }),
        }
      }),
    }))
  }

  const updateWorkflowStep = (
    workflowId: string,
    stepId: string,
    patch: Partial<WorkflowConfig["workflowPermissions"][number]["steps"][number]>
  ) => {
    setConfig((current) => ({
      ...current,
      workflowPermissions: current.workflowPermissions.map((workflowRule) => (
        workflowRule.id === workflowId
          ? {
              ...workflowRule,
              steps: workflowRule.steps.map((step) => (step.id === stepId ? { ...step, ...patch } : step)),
            }
          : workflowRule
      )),
    }))
  }

  const save = async () => {
    const mode = await saveWorkflowConfig(config)
    setStorageMode(mode)
    setSaveStatus(mode === "supabase" ? "Đã lưu lên Supabase." : "Đã lưu local, chưa ghi được Supabase.")
    window.setTimeout(() => setSaveStatus(""), 1600)
  }

  const updateNode = (nodeId: string, patch: Partial<NonNullable<typeof selectedNode>>) => {
    setConfig((current) => ({
      ...current,
      canvasNodes: current.canvasNodes.map((node) => (node.id === nodeId ? { ...node, ...patch } : node)),
    }))
  }

  const updateEdge = (edgeId: string, label: string) => {
    setConfig((current) => ({
      ...current,
      canvasEdges: current.canvasEdges.map((edge) => (edge.id === edgeId ? { ...edge, label } : edge)),
    }))
  }

  const addNode = () => {
    const id = `node-${Date.now()}`
    setConfig((current) => ({
      ...current,
      canvasNodes: [
        ...current.canvasNodes,
        {
          id,
          title: "Bước workflow mới",
          role: "USER",
          ...findOpenCanvasPosition(current.canvasNodes),
          bindings: [],
        },
      ],
    }))
    setSelectedNodeId(id)
    setSelectedEdgeId("")
  }

  const deleteNode = (nodeId: string) => {
    setConfig((current) => {
      const nextNodes = current.canvasNodes.filter((node) => node.id !== nodeId)
      return {
        ...current,
        canvasNodes: nextNodes,
        canvasEdges: current.canvasEdges.filter((edge) => edge.from !== nodeId && edge.to !== nodeId),
      }
    })
    setSelectedNodeId(config.canvasNodes.find((node) => node.id !== nodeId)?.id || "")
    setSelectedEdgeId("")
  }

  const deleteEdge = (edgeId: string) => {
    setConfig((current) => ({
      ...current,
      canvasEdges: current.canvasEdges.filter((edge) => edge.id !== edgeId),
    }))
    setSelectedEdgeId("")
  }

  const addBinding = (optionId: string) => {
    if (!selectedNode || !optionId) return
    const option = bindingOptions.find((item) => item.id === optionId)
    if (!option) return
    const exists = selectedNode.bindings?.some((binding) => binding.source === option.source && binding.value === option.value)
    if (exists) return

    updateNode(selectedNode.id, {
      bindings: [
        ...(selectedNode.bindings || []),
        {
          id: `binding-${Date.now()}`,
          source: option.source,
          value: option.value,
          label: option.label,
        },
      ],
    })
  }

  const removeBinding = (bindingId: string) => {
    if (!selectedNode) return
    updateNode(selectedNode.id, { bindings: (selectedNode.bindings || []).filter((binding) => binding.id !== bindingId) })
  }

  const createEdge = useCallback((from: string, to: string) => {
    if (!from || !to || from === to) return
    setConfig((current) => {
      const exists = current.canvasEdges.some((edge) => edge.from === from && edge.to === to)
      if (exists) return current
      return {
        ...current,
        canvasEdges: [
          ...current.canvasEdges,
          {
            id: `edge-${from}-${to}-${Date.now()}`,
            from,
            to,
            label: edgeLabel.trim() || "Luồng dữ liệu",
          },
        ],
      }
    })
  }, [edgeLabel])

  const handleNodeClick = (nodeId: string) => {
    setSelectedNodeId(nodeId)
    setSelectedEdgeId("")

    if (canvasMode === "connect") {
      if (!connectFromId) {
        setConnectFromId(nodeId)
        return
      }
      createEdge(connectFromId, nodeId)
      setConnectFromId("")
      setCanvasMode("select")
    }
  }

  const handleNodesChange = useCallback((changes: NodeChange<WorkflowFlowNode>[]) => {
    if (!canManage || canvasMode !== "select") return
    const positionChanges = changes.flatMap((change) => {
      if (change.type !== "position" || !("id" in change) || !change.position) return []
      return [{ id: change.id, position: change.position }]
    })
    if (positionChanges.length === 0) return

    setConfig((current) => ({
      ...current,
      canvasNodes: current.canvasNodes.map((node) => {
        const change = positionChanges.find((item) => item.id === node.id)
        if (!change?.position) return node
        return {
          ...node,
          x: Math.max(0, Math.min(canvasWidth - nodeWidth, change.position.x)),
          y: Math.max(0, Math.min(canvasHeight - nodeHeight, change.position.y)),
        }
      }),
    }))
  }, [canManage, canvasMode])

  if (!mounted) return null

  return (
    <DashboardLayout title="Cấu Hình Workflow">
      <div className="space-y-5">
        <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#006b68]">Admin LV0</p>
              <h1 className="mt-2 text-2xl font-bold text-slate-950">Cấu hình luồng quy trình chung</h1>
              <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">
                Canvas này lưu cấu trúc node, đường kết nối và binding dữ liệu dùng chung cho user/admin.
              </p>
              <p className="mt-1 text-xs font-semibold text-slate-400">
                Nguồn cấu hình: {storageMode === "supabase" ? "Supabase" : "Local fallback"}
              </p>
            </div>
            <div className="flex flex-col items-start gap-2 sm:flex-row sm:items-center">
              {saveStatus && <span className="text-sm font-semibold text-emerald-700">{saveStatus}</span>}
              <button
                type="button"
                onClick={save}
                disabled={!canManage}
                className="inline-flex h-10 items-center gap-2 rounded-md bg-[#006b68] px-4 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50"
              >
                <Save className="h-4 w-4" />
                Lưu cấu hình
              </button>
            </div>
          </div>
          {!canManage && (
            <div className="mt-4 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
              Chỉ Admin LV0 được thêm, sửa, xóa cấu hình workflow/droplist chung.
            </div>
          )}
        </section>

        <section className="grid gap-5 xl:grid-cols-[360px_minmax(0,1fr)]">
          <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">Droplist hệ thống</p>
            <div className="mt-3 grid gap-2">
              {categoryKeys.map((key) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => setActiveKey(key)}
                  className={clsx(
                    "flex items-center justify-between rounded-md border px-3 py-2 text-left text-sm font-semibold transition",
                    activeKey === key ? "border-[#006b68] bg-emerald-50 text-[#006b68]" : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
                  )}
                >
                  {categoryLabels[key]}
                  <span className="rounded-md bg-slate-100 px-2 py-0.5 text-xs text-slate-500">{config.categories[key].length}</span>
                </button>
              ))}
            </div>
          </div>

          <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">Đang cấu hình</p>
                <h2 className="mt-1 text-lg font-bold text-slate-950">{categoryLabels[activeKey]}</h2>
              </div>
              <button
                type="button"
                disabled={!canManage}
                onClick={() => updateOptions([...activeOptions, { id: `${activeKey}-${Date.now()}`, label: "Mục mới", value: "OTHER_VALUE", active: true }])}
                className="inline-flex h-9 items-center gap-2 rounded-md border border-[#006b68] px-3 text-sm font-semibold text-[#006b68] disabled:opacity-40"
              >
                <Plus className="h-4 w-4" />
                Thêm
              </button>
            </div>
            <div className="mt-4 space-y-2">
              {activeOptions.map((option, index) => (
                <OptionRow
                  key={option.id}
                  option={option}
                  disabled={!canManage}
                  onChange={(patch) => updateOptions(activeOptions.map((row, rowIndex) => (rowIndex === index ? { ...row, ...patch } : row)))}
                  onDelete={() => updateOptions(activeOptions.filter((_, rowIndex) => rowIndex !== index))}
                />
              ))}
            </div>
          </div>
        </section>

        <section className="grid gap-5 xl:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
          <PermissionLogicGraph
            businessPermissions={config.businessPermissions}
            workflowPermissions={config.workflowPermissions}
          />
          <BusinessPermissionMatrix
            canManage={canManage}
            groups={config.businessPermissions}
            onToggle={toggleBusinessPermission}
          />
        </section>

        <WorkflowSpecificPermissionMatrix
          canManage={canManage}
          workflows={config.workflowPermissions}
          onToggleAction={toggleWorkflowStepAction}
          onUpdateStep={updateWorkflowStep}
        />

        <section className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_400px]">
          <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
            <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
              <div className="flex items-center gap-2">
                <Workflow className="h-5 w-5 text-[#006b68]" />
                <h2 className="text-lg font-bold text-slate-950">Canvas workflow quyền thao tác</h2>
              </div>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  disabled={!canManage}
                  onClick={() => {
                    setCanvasMode("select")
                    setConnectFromId("")
                  }}
                  className={clsx("inline-flex h-9 items-center gap-2 rounded-md border px-3 text-sm font-semibold", canvasMode === "select" ? "border-[#006b68] bg-emerald-50 text-[#006b68]" : "border-slate-200 text-slate-600", !canManage && "opacity-40")}
                >
                  <MousePointer2 className="h-4 w-4" />
                  Chọn/kéo
                </button>
                <button
                  type="button"
                  disabled={!canManage}
                  onClick={() => {
                    setCanvasMode("connect")
                    setConnectFromId("")
                  }}
                  className={clsx("inline-flex h-9 items-center gap-2 rounded-md border px-3 text-sm font-semibold", canvasMode === "connect" ? "border-[#006b68] bg-emerald-50 text-[#006b68]" : "border-slate-200 text-slate-600", !canManage && "opacity-40")}
                >
                  <Link2 className="h-4 w-4" />
                  Nối node
                </button>
                <button
                  type="button"
                  disabled={!canManage}
                  onClick={addNode}
                  className="inline-flex h-9 items-center gap-2 rounded-md bg-slate-900 px-3 text-sm font-semibold text-white disabled:opacity-40"
                >
                  <Plus className="h-4 w-4" />
                  Node
                </button>
              </div>
            </div>

            <div className="mt-3 grid gap-3 sm:grid-cols-[minmax(0,1fr)_220px]">
              <label className="block">
                <span className="text-xs font-semibold text-slate-500">Nhãn đường nối mới</span>
                <input
                  disabled={!canManage}
                  value={edgeLabel}
                  onChange={(event) => setEdgeLabel(event.target.value)}
                  className="mt-1 h-10 w-full rounded-md border border-slate-200 px-3 text-sm outline-none focus:border-[#006b68] disabled:bg-slate-100"
                />
              </label>
              <div className="rounded-md border border-slate-200 bg-slate-50 p-3 text-xs leading-5 text-slate-600">
                {canvasMode === "connect" ? (connectFromId ? `Nguồn: ${config.canvasNodes.find((node) => node.id === connectFromId)?.title || connectFromId}` : "Chọn node nguồn") : `${config.canvasNodes.length} node · ${config.canvasEdges.length} kết nối`}
              </div>
            </div>

            <div className="mt-4 overflow-hidden rounded-lg border border-slate-200 bg-white">
              <div className="h-[520px] min-h-[520px]">
                <ReactFlow
                  nodes={flowNodes}
                  edges={flowEdges}
                  nodeTypes={workflowNodeTypes}
                  onNodesChange={handleNodesChange}
                  onNodeClick={(_, node) => handleNodeClick(node.id)}
                  onEdgeClick={(_, edge) => {
                    setSelectedEdgeId(edge.id)
                    setSelectedNodeId("")
                  }}
                  onConnect={(connection) => {
                    if (!canManage || !connection.source || !connection.target) return
                    createEdge(connection.source, connection.target)
                    setCanvasMode("select")
                    setConnectFromId("")
                  }}
                  nodesDraggable={canManage && canvasMode === "select"}
                  nodesConnectable={canManage && canvasMode === "connect"}
                  elementsSelectable
                  fitView
                  fitViewOptions={{ padding: 0.18, maxZoom: 1.1 }}
                  minZoom={0.45}
                  maxZoom={1.45}
                  defaultViewport={{ x: 24, y: 24, zoom: 0.9 }}
                  proOptions={{ hideAttribution: true }}
                  className="bg-[linear-gradient(180deg,#ffffff_0%,#f8fafc_100%)]"
                >
                  <Background color="#cbd5e1" gap={24} size={1.2} />
                  <MiniMap
                    pannable
                    zoomable
                    nodeColor={(node) => node.id === selectedNodeId ? "#006b68" : "#cbd5e1"}
                    maskColor="rgba(15, 23, 42, 0.08)"
                    className="!rounded-md !border !border-slate-200 !bg-white"
                  />
                  <Controls className="!border !border-slate-200 !shadow-sm" />
                </ReactFlow>
              </div>
            </div>
          </div>

          <WorkflowInspector
            canManage={canManage}
            selectedNode={selectedNode}
            selectedEdge={selectedEdge}
            selectedRoleRule={selectedRoleRule}
            bindingOptions={bindingOptions}
            onUpdateNode={(patch) => selectedNode && updateNode(selectedNode.id, patch)}
            onDeleteNode={() => selectedNode && deleteNode(selectedNode.id)}
            onAddBinding={addBinding}
            onRemoveBinding={removeBinding}
            onUpdateEdge={(label) => selectedEdge && updateEdge(selectedEdge.id, label)}
            onDeleteEdge={() => selectedEdge && deleteEdge(selectedEdge.id)}
          />
        </section>

        <section className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">Ma trận quyền mẫu</p>
          <div className="mt-3 grid gap-3 lg:grid-cols-2">
            {config.roleRules.map((rule, index) => (
              <div key={rule.role} className={clsx("rounded-lg border p-3", selectedNode?.role === rule.role ? "border-[#006b68] bg-emerald-50" : "border-slate-200 bg-slate-50")}>
                <p className="text-sm font-bold text-slate-950">{rule.role}</p>
                <p className="mt-1 text-xs text-slate-500">{rule.scope}</p>
                <textarea
                  disabled={!canManage}
                  value={rule.actions.join("\n")}
                  onChange={(event) => {
                    const actions = event.target.value.split("\n").map((item) => item.trim()).filter(Boolean)
                    setConfig((current) => ({
                      ...current,
                      roleRules: current.roleRules.map((row, rowIndex) => (rowIndex === index ? { ...row, actions } : row)),
                    }))
                  }}
                  rows={4}
                  className="mt-2 w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-xs leading-5 outline-none disabled:bg-slate-100"
                />
              </div>
            ))}
          </div>
        </section>
      </div>
    </DashboardLayout>
  )
}

function PermissionLogicGraph({
  businessPermissions,
  workflowPermissions,
}: {
  businessPermissions: WorkflowConfig["businessPermissions"]
  workflowPermissions: WorkflowConfig["workflowPermissions"]
}) {
  const businessGrantCount = businessPermissions.reduce((total, group) => total + Object.values(group.permissions).reduce((sum, actions) => sum + actions.length, 0), 0)
  const workflowStepCount = workflowPermissions.reduce((total, workflowRule) => total + workflowRule.steps.length, 0)

  return (
    <section className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex items-center gap-2">
        <Brain className="h-5 w-5 text-[#006b68]" />
        <h2 className="text-lg font-bold text-slate-950">Graph logic phân quyền</h2>
      </div>
      <p className="mt-2 text-sm leading-6 text-slate-600">
        Quyền hiệu lực không lấy từ một role đơn lẻ. Hệ thống cần thỏa đồng thời quyền chung theo khối nghiệp vụ và quyền riêng của workflow đang chạy.
      </p>

      <div className="mt-4 grid gap-3">
        <LogicNode icon={<ShieldCheck className="h-4 w-4" />} title="User / Role" detail={`${roleOptions.length} nhóm vai trò`} />
        <LogicArrow label="được tick theo" />
        <LogicNode icon={<Layers3 className="h-4 w-4" />} title="Khối nghiệp vụ" detail={`${businessPermissions.length} khối · ${businessGrantCount} quyền`} />
        <LogicArrow label="giao với" />
        <LogicNode icon={<GitBranch className="h-4 w-4" />} title="Workflow cụ thể" detail={`${workflowPermissions.length} workflow · ${workflowStepCount} bước`} />
        <LogicArrow label="tạo thành" />
        <LogicNode icon={<LockKeyhole className="h-4 w-4" />} title="Quyền hiệu lực" detail="Allow = role có quyền khối và có quyền tại bước workflow" strong />
      </div>
    </section>
  )
}

function LogicNode({ icon, title, detail, strong }: { icon: ReactNode; title: string; detail: string; strong?: boolean }) {
  return (
    <div className={clsx("flex items-start gap-3 rounded-lg border p-3", strong ? "border-[#006b68] bg-emerald-50" : "border-slate-200 bg-slate-50")}>
      <span className={clsx("inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-md", strong ? "bg-[#006b68] text-white" : "bg-white text-[#006b68]")}>
        {icon}
      </span>
      <div>
        <p className="text-sm font-bold text-slate-950">{title}</p>
        <p className="mt-1 text-xs leading-5 text-slate-600">{detail}</p>
      </div>
    </div>
  )
}

function LogicArrow({ label }: { label: string }) {
  return (
    <div className="flex items-center gap-2 px-4 text-xs font-semibold uppercase tracking-[0.14em] text-slate-400">
      <span className="h-px flex-1 bg-slate-200" />
      {label}
      <span className="h-px flex-1 bg-slate-200" />
    </div>
  )
}

function BusinessPermissionMatrix({
  canManage,
  groups,
  onToggle,
}: {
  canManage: boolean
  groups: WorkflowConfig["businessPermissions"]
  onToggle: (groupId: string, role: string, action: PermissionActionKey) => void
}) {
  return (
    <section className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">1. Phân quyền chung</p>
          <h2 className="mt-1 text-lg font-bold text-slate-950">Theo khối nghiệp vụ</h2>
        </div>
        <span className="rounded-md bg-slate-100 px-2 py-1 text-xs font-semibold text-slate-500">{groups.length} khối</span>
      </div>
      <div className="mt-4 space-y-4">
        {groups.map((group) => (
          <div key={group.id} className="rounded-lg border border-slate-200 bg-slate-50 p-3">
            <div className="flex flex-col gap-1 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <h3 className="text-sm font-bold text-slate-950">{group.title}</h3>
                <p className="mt-1 text-xs leading-5 text-slate-600">{group.description}</p>
              </div>
            </div>
            <div className="mt-3 overflow-x-auto rounded-md border border-slate-200 bg-white">
              <table className="min-w-[760px] w-full text-left text-xs">
                <thead className="bg-slate-50 text-slate-500">
                  <tr>
                    <th className="w-32 px-3 py-2 font-semibold">Role</th>
                    {permissionActionOptions.map((action) => (
                      <th key={action.key} className="px-2 py-2 text-center font-semibold">{action.label}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {roleOptions.map((role) => (
                    <tr key={role}>
                      <td className="px-3 py-2 font-semibold text-slate-700">{roleLabels[role]}</td>
                      {permissionActionOptions.map((action) => {
                        const checked = (group.permissions[role] || []).includes(action.key)
                        return (
                          <td key={action.key} className="px-2 py-2 text-center">
                            <input
                              type="checkbox"
                              disabled={!canManage}
                              checked={checked}
                              onChange={() => onToggle(group.id, role, action.key)}
                              className="h-4 w-4 rounded border-slate-300 text-[#006b68] focus:ring-[#006b68] disabled:opacity-40"
                              aria-label={`${group.title} ${roleLabels[role]} ${action.label}`}
                            />
                          </td>
                        )
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ))}
      </div>
    </section>
  )
}

function WorkflowSpecificPermissionMatrix({
  canManage,
  workflows,
  onToggleAction,
  onUpdateStep,
}: {
  canManage: boolean
  workflows: WorkflowConfig["workflowPermissions"]
  onToggleAction: (workflowId: string, stepId: string, action: PermissionActionKey) => void
  onUpdateStep: (workflowId: string, stepId: string, patch: Partial<WorkflowConfig["workflowPermissions"][number]["steps"][number]>) => void
}) {
  return (
    <section className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">2. Phân quyền workflow cụ thể</p>
          <h2 className="mt-1 text-lg font-bold text-slate-950">Theo từng luồng và từng bước xử lý</h2>
          <p className="mt-1 text-sm leading-6 text-slate-600">
            Mỗi workflow có role phụ trách và bộ quyền riêng. Quyền này dùng để khóa thao tác theo đúng bước, không thay thế ma trận quyền chung.
          </p>
        </div>
        <span className="rounded-md bg-slate-100 px-2 py-1 text-xs font-semibold text-slate-500">{workflows.length} workflow</span>
      </div>

      <div className="mt-4 grid gap-4 xl:grid-cols-3">
        {workflows.map((workflowRule) => (
          <div key={workflowRule.id} className="rounded-lg border border-slate-200 bg-slate-50 p-3">
            <div className="flex items-start gap-2">
              <span className="mt-0.5 inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-white text-[#006b68]">
                <GitBranch className="h-4 w-4" />
              </span>
              <div className="min-w-0">
                <h3 className="text-sm font-bold text-slate-950">{workflowRule.workflowName}</h3>
                <p className="mt-1 text-[11px] font-semibold text-slate-500">{workflowRule.ownerUnit}</p>
                <p className="mt-1 text-xs leading-5 text-slate-600">{workflowRule.description}</p>
              </div>
            </div>

            <div className="mt-3 space-y-3">
              {workflowRule.steps.map((step, index) => (
                <div key={step.id} className="rounded-md border border-slate-200 bg-white p-3">
                  <div className="flex items-start gap-2">
                    <span className="inline-flex h-6 w-6 shrink-0 items-center justify-center rounded bg-emerald-50 text-xs font-bold text-[#006b68]">{index + 1}</span>
                    <div className="min-w-0 flex-1">
                      <input
                        disabled={!canManage}
                        value={step.title}
                        onChange={(event) => onUpdateStep(workflowRule.id, step.id, { title: event.target.value })}
                        className="h-8 w-full rounded-md border border-slate-200 px-2 text-sm font-semibold text-slate-900 outline-none disabled:border-transparent disabled:bg-transparent disabled:px-0"
                      />
                      <select
                        disabled={!canManage}
                        value={step.role}
                        onChange={(event) => onUpdateStep(workflowRule.id, step.id, { role: event.target.value })}
                        className="mt-2 h-8 w-full rounded-md border border-slate-200 bg-white px-2 text-xs font-semibold text-slate-600 outline-none disabled:bg-slate-100"
                      >
                        {roleOptions.map((role) => (
                          <option key={role} value={role}>{roleLabels[role]}</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div className="mt-3 grid grid-cols-2 gap-2">
                    {permissionActionOptions.map((action) => (
                      <label key={action.key} className="flex items-center gap-2 rounded-md border border-slate-100 bg-slate-50 px-2 py-1.5 text-xs font-semibold text-slate-600">
                        <input
                          type="checkbox"
                          disabled={!canManage}
                          checked={step.actions.includes(action.key)}
                          onChange={() => onToggleAction(workflowRule.id, step.id, action.key)}
                          className="h-4 w-4 rounded border-slate-300 text-[#006b68] focus:ring-[#006b68] disabled:opacity-40"
                        />
                        {action.label}
                      </label>
                    ))}
                  </div>

                  <textarea
                    disabled={!canManage}
                    value={step.notes.join("\n")}
                    onChange={(event) => onUpdateStep(workflowRule.id, step.id, { notes: event.target.value.split("\n").map((item) => item.trim()).filter(Boolean) })}
                    rows={2}
                    className="mt-3 w-full rounded-md border border-slate-200 px-2 py-2 text-xs leading-5 text-slate-600 outline-none disabled:bg-slate-100"
                    placeholder="Ghi chú điều kiện quyền"
                  />
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </section>
  )
}

const workflowNodeTypes = {
  workflowNode: WorkflowFlowNodeCard,
}

function WorkflowFlowNodeCard({ data }: NodeProps<WorkflowFlowNode>) {
  const bindings = data.bindings || []

  return (
    <div
      className={clsx(
        "w-[210px] select-none rounded-lg border bg-white p-3 shadow-sm ring-offset-2 transition",
        data.selected ? "border-[#006b68] shadow-md ring-2 ring-[#006b68]/20" : "border-slate-200",
        data.connecting && "border-sky-500 ring-2 ring-sky-200"
      )}
    >
      <Handle
        type="target"
        position={Position.Left}
        className="!h-3 !w-3 !border-2 !border-white !bg-[#006b68]"
      />
      <Handle
        type="source"
        position={Position.Right}
        className="!h-3 !w-3 !border-2 !border-white !bg-[#006b68]"
      />

      <div className="flex items-start gap-2">
        <span className="mt-0.5 inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-emerald-50 text-[#006b68]">
          {data.role === "ADMIN_LEVEL_0" ? <ShieldCheck className="h-4 w-4" /> : <Workflow className="h-4 w-4" />}
        </span>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-bold text-slate-950" title={data.title}>{data.title}</p>
          <p className="mt-1 w-fit rounded-md bg-slate-100 px-2 py-1 text-[11px] font-semibold text-slate-600">{data.role}</p>
        </div>
        <Grip className="mt-1 h-4 w-4 shrink-0 text-slate-300" />
      </div>

      <div className="mt-3 flex items-center gap-2 rounded-md border border-slate-100 bg-slate-50 px-2 py-1.5 text-[11px] font-semibold text-slate-500">
        <Database className="h-3.5 w-3.5 text-[#006b68]" />
        <span>{bindings.length} binding</span>
      </div>

      <div className="mt-2 flex flex-wrap gap-1">
        {bindings.slice(0, 3).map((binding) => (
          <span key={binding.id} className="max-w-full truncate rounded bg-emerald-50 px-1.5 py-0.5 text-[10px] font-semibold text-[#006b68]" title={binding.label}>
            {binding.label}
          </span>
        ))}
        {bindings.length > 3 && <span className="rounded bg-slate-100 px-1.5 py-0.5 text-[10px] font-semibold text-slate-500">+{bindings.length - 3}</span>}
      </div>
    </div>
  )
}

function WorkflowInspector({
  canManage,
  selectedNode,
  selectedEdge,
  selectedRoleRule,
  bindingOptions,
  onUpdateNode,
  onDeleteNode,
  onAddBinding,
  onRemoveBinding,
  onUpdateEdge,
  onDeleteEdge,
}: {
  canManage: boolean
  selectedNode?: WorkflowConfig["canvasNodes"][number]
  selectedEdge?: WorkflowConfig["canvasEdges"][number]
  selectedRoleRule: WorkflowConfig["roleRules"][number] | null
  bindingOptions: BindingOption[]
  onUpdateNode: (patch: Partial<WorkflowConfig["canvasNodes"][number]>) => void
  onDeleteNode: () => void
  onAddBinding: (optionId: string) => void
  onRemoveBinding: (bindingId: string) => void
  onUpdateEdge: (label: string) => void
  onDeleteEdge: () => void
}) {
  if (selectedEdge) {
    return (
      <aside className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">Kết nối đang chọn</p>
        <label className="mt-3 block">
          <span className="text-xs font-semibold text-slate-500">Nhãn kết nối</span>
          <input
            disabled={!canManage}
            value={selectedEdge.label}
            onChange={(event) => onUpdateEdge(event.target.value)}
            className="mt-1 h-10 w-full rounded-md border border-slate-200 px-3 text-sm outline-none focus:border-[#006b68] disabled:bg-slate-100"
          />
        </label>
        <div className="mt-3 rounded-md bg-slate-50 p-3 text-sm text-slate-600 ring-1 ring-slate-200">
          {selectedEdge.from} → {selectedEdge.to}
        </div>
        <button type="button" disabled={!canManage} onClick={onDeleteEdge} className="mt-4 inline-flex h-10 w-full items-center justify-center gap-2 rounded-md border border-rose-200 text-sm font-semibold text-rose-600 disabled:opacity-40">
          <Trash2 className="h-4 w-4" />
          Xóa kết nối
        </button>
      </aside>
    )
  }

  if (!selectedNode) {
    return (
      <aside className="rounded-lg border border-dashed border-slate-200 bg-white p-4 text-sm text-slate-500 shadow-sm">
        Chọn một node hoặc một kết nối trên canvas.
      </aside>
    )
  }

  const selectedBindingIds = new Set((selectedNode.bindings || []).map((binding) => `${binding.source}:${binding.value}`))
  const availableBindings = bindingOptions.filter((option) => !selectedBindingIds.has(`${option.source}:${option.value}`))

  return (
    <aside className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">Node đang chọn</p>
          <h3 className="mt-1 text-base font-bold text-slate-950">{selectedNode.title}</h3>
        </div>
        <button type="button" disabled={!canManage} onClick={onDeleteNode} className="rounded-md border border-rose-200 p-2 text-rose-600 disabled:opacity-40" aria-label="Xóa node">
          <Trash2 className="h-4 w-4" />
        </button>
      </div>

      <label className="mt-4 block">
        <span className="text-xs font-semibold text-slate-500">Tên node</span>
        <input
          disabled={!canManage}
          value={selectedNode.title}
          onChange={(event) => onUpdateNode({ title: event.target.value })}
          className="mt-1 h-10 w-full rounded-md border border-slate-200 px-3 text-sm outline-none focus:border-[#006b68] disabled:bg-slate-100"
        />
      </label>

      <label className="mt-3 block">
        <span className="text-xs font-semibold text-slate-500">Role</span>
        <select
          disabled={!canManage}
          value={selectedNode.role}
          onChange={(event) => onUpdateNode({ role: event.target.value })}
          className="mt-1 h-10 w-full rounded-md border border-slate-200 bg-white px-3 text-sm outline-none focus:border-[#006b68] disabled:bg-slate-100"
        >
          {roleOptions.map((role) => (
            <option key={role} value={role}>{role}</option>
          ))}
        </select>
      </label>

      <div className="mt-3 grid grid-cols-2 gap-2">
        <NumberField label="X" value={Math.round(selectedNode.x)} disabled={!canManage} onChange={(value) => onUpdateNode({ x: value })} />
        <NumberField label="Y" value={Math.round(selectedNode.y)} disabled={!canManage} onChange={(value) => onUpdateNode({ y: value })} />
      </div>

      {selectedRoleRule && (
        <div className="mt-4 rounded-md border border-emerald-100 bg-emerald-50 p-3 text-xs leading-5 text-emerald-900">
          <p className="font-semibold">{selectedRoleRule.scope}</p>
          <p className="mt-1">{selectedRoleRule.actions.join(" · ")}</p>
        </div>
      )}

      <div className="mt-4">
        <div className="flex items-center justify-between gap-2">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">Binding dữ liệu</p>
          <span className="rounded bg-slate-100 px-2 py-1 text-xs font-semibold text-slate-500">{selectedNode.bindings?.length || 0}</span>
        </div>
        <select
          disabled={!canManage || availableBindings.length === 0}
          value=""
          onChange={(event) => onAddBinding(event.target.value)}
          className="mt-2 h-10 w-full rounded-md border border-slate-200 bg-white px-3 text-sm outline-none focus:border-[#006b68] disabled:bg-slate-100"
        >
          <option value="">Gắn thêm dữ liệu</option>
          {availableBindings.map((option) => (
            <option key={option.id} value={option.id}>{option.groupLabel} · {option.label}</option>
          ))}
        </select>
        <div className="mt-3 space-y-2">
          {(selectedNode.bindings || []).map((binding) => (
            <div key={binding.id} className="flex items-start gap-2 rounded-md border border-slate-200 bg-slate-50 p-2">
              <Check className="mt-0.5 h-4 w-4 shrink-0 text-[#006b68]" />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold text-slate-800">{binding.label}</p>
                <p className="mt-0.5 truncate text-[11px] text-slate-500">{bindingSourceLabels[binding.source]} · {binding.value}</p>
              </div>
              <button type="button" disabled={!canManage} onClick={() => onRemoveBinding(binding.id)} className="rounded p-1 text-slate-400 hover:text-rose-600 disabled:opacity-40" aria-label="Bỏ binding">
                <X className="h-4 w-4" />
              </button>
            </div>
          ))}
        </div>
      </div>
    </aside>
  )
}

function NumberField({ label, value, disabled, onChange }: { label: string; value: number; disabled: boolean; onChange: (value: number) => void }) {
  return (
    <label className="block">
      <span className="text-xs font-semibold text-slate-500">{label}</span>
      <input
        type="number"
        disabled={disabled}
        value={value}
        onChange={(event) => onChange(Math.max(0, Number(event.target.value) || 0))}
        className="mt-1 h-10 w-full rounded-md border border-slate-200 px-3 text-sm outline-none focus:border-[#006b68] disabled:bg-slate-100"
      />
    </label>
  )
}

function OptionRow({ option, disabled, onChange, onDelete }: { option: ConfigOption; disabled: boolean; onChange: (patch: Partial<ConfigOption>) => void; onDelete: () => void }) {
  return (
    <div className="grid gap-2 rounded-lg border border-slate-200 bg-slate-50 p-3 md:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto_auto]">
      <input disabled={disabled} value={option.label} onChange={(event) => onChange({ label: event.target.value })} className="h-10 rounded-md border border-slate-200 bg-white px-3 text-sm outline-none disabled:bg-slate-100" />
      <input disabled={disabled} value={option.value} onChange={(event) => onChange({ value: event.target.value })} className="h-10 rounded-md border border-slate-200 bg-white px-3 text-sm font-mono outline-none disabled:bg-slate-100" />
      <label className="flex h-10 items-center gap-2 rounded-md border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-600">
        <input disabled={disabled} type="checkbox" checked={option.active} onChange={(event) => onChange({ active: event.target.checked })} />
        Hiện
      </label>
      <button type="button" disabled={disabled} onClick={onDelete} className="inline-flex h-10 items-center justify-center rounded-md border border-rose-200 px-3 text-rose-600 disabled:opacity-40">
        <Trash2 className="h-4 w-4" />
      </button>
    </div>
  )
}
