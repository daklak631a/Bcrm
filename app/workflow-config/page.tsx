"use client"

import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import clsx from "clsx"
import { Check, Grip, Link2, MousePointer2, Plus, Save, Trash2, Workflow, X } from "lucide-react"
import { DashboardLayout } from "@/components/layout/DashboardLayout"
import { useAuthStore } from "@/store/useAuthStore"
import {
  ConfigCategoryKey,
  ConfigOption,
  WorkflowCanvasBinding,
  WorkflowCanvasBindingSource,
  WorkflowConfig,
  defaultWorkflowConfig,
  getWorkflowConfig,
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

type DragState = {
  nodeId: string
  offsetX: number
  offsetY: number
}

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
  const canvasRef = useRef<HTMLDivElement | null>(null)
  const dragRef = useRef<DragState | null>(null)
  const dragMovedRef = useRef(false)
  const [mounted, setMounted] = useState(false)
  const [config, setConfig] = useState<WorkflowConfig>(defaultWorkflowConfig)
  const [activeKey, setActiveKey] = useState<ConfigCategoryKey>("salesGroups")
  const [selectedNodeId, setSelectedNodeId] = useState("n-lv0")
  const [selectedEdgeId, setSelectedEdgeId] = useState("")
  const [canvasMode, setCanvasMode] = useState<CanvasMode>("select")
  const [connectFromId, setConnectFromId] = useState("")
  const [edgeLabel, setEdgeLabel] = useState("Luồng dữ liệu")
  const [saveStatus, setSaveStatus] = useState("")
  const canManage = user?.role === "ADMIN_LEVEL_0"

  useEffect(() => {
    setMounted(true)
    const persisted = getWorkflowConfig()
    setConfig(persisted)
    setSelectedNodeId(persisted.canvasNodes.find((node) => node.role === "ADMIN_LEVEL_0")?.id || persisted.canvasNodes[0]?.id || "")
  }, [])

  const activeOptions = config.categories[activeKey] || []
  const selectedNode = useMemo(() => config.canvasNodes.find((node) => node.id === selectedNodeId), [config.canvasNodes, selectedNodeId])
  const selectedEdge = useMemo(() => config.canvasEdges.find((edge) => edge.id === selectedEdgeId), [config.canvasEdges, selectedEdgeId])
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

  const save = () => {
    saveWorkflowConfig(config)
    setSaveStatus("Đã lưu cấu hình workflow LV0.")
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
    if (dragMovedRef.current) {
      dragMovedRef.current = false
      return
    }

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

  const startDrag = (event: React.PointerEvent<HTMLDivElement>, nodeId: string) => {
    if (!canManage || canvasMode === "connect") return
    const canvas = canvasRef.current
    if (!canvas) return
    const node = config.canvasNodes.find((item) => item.id === nodeId)
    if (!node) return
    const rect = canvas.getBoundingClientRect()
    dragRef.current = {
      nodeId,
      offsetX: event.clientX - rect.left + canvas.scrollLeft - node.x,
      offsetY: event.clientY - rect.top + canvas.scrollTop - node.y,
    }
    dragMovedRef.current = false
    event.currentTarget.setPointerCapture(event.pointerId)
  }

  const moveDrag = (event: React.PointerEvent<HTMLDivElement>) => {
    const drag = dragRef.current
    const canvas = canvasRef.current
    if (!drag || !canvas) return
    const rect = canvas.getBoundingClientRect()
    const x = Math.max(0, Math.min(canvasWidth - nodeWidth, event.clientX - rect.left + canvas.scrollLeft - drag.offsetX))
    const y = Math.max(0, Math.min(canvasHeight - nodeHeight, event.clientY - rect.top + canvas.scrollTop - drag.offsetY))
    dragMovedRef.current = true
    updateNode(drag.nodeId, { x, y })
  }

  const endDrag = (event: React.PointerEvent<HTMLDivElement>) => {
    if (!dragRef.current) return
    dragRef.current = null
    event.currentTarget.releasePointerCapture(event.pointerId)
    window.setTimeout(() => {
      dragMovedRef.current = false
    }, 0)
  }

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

            <div ref={canvasRef} className="mt-4 overflow-auto rounded-lg border border-slate-200 bg-[radial-gradient(circle_at_1px_1px,#cbd5e1_1px,transparent_0)] [background-size:24px_24px]">
              <div className="relative" style={{ width: canvasWidth, height: canvasHeight }}>
                <svg className="absolute inset-0 h-full w-full overflow-visible">
                  <defs>
                    <marker id="workflow-arrow" markerWidth="10" markerHeight="10" refX="8" refY="3" orient="auto" markerUnits="strokeWidth">
                      <path d="M0,0 L0,6 L9,3 z" fill="#006b68" />
                    </marker>
                  </defs>
                  {config.canvasEdges.map((edge) => {
                    const from = config.canvasNodes.find((node) => node.id === edge.from)
                    const to = config.canvasNodes.find((node) => node.id === edge.to)
                    if (!from || !to) return null
                    const x1 = from.x + nodeWidth / 2
                    const y1 = from.y + nodeHeight / 2
                    const x2 = to.x + nodeWidth / 2
                    const y2 = to.y + nodeHeight / 2
                    const labelX = (x1 + x2) / 2
                    const labelY = (y1 + y2) / 2
                    const active = selectedEdgeId === edge.id
                    return (
                      <g key={edge.id} className="cursor-pointer" onClick={() => {
                        setSelectedEdgeId(edge.id)
                        setSelectedNodeId("")
                      }}>
                        <line x1={x1} y1={y1} x2={x2} y2={y2} stroke={active ? "#0f172a" : "#006b68"} strokeWidth={active ? 3 : 2} strokeLinecap="round" markerEnd="url(#workflow-arrow)" />
                        <rect x={labelX - 72} y={labelY - 13} width="144" height="26" rx="6" fill="white" stroke={active ? "#0f172a" : "#cbd5e1"} />
                        <text x={labelX} y={labelY + 4} textAnchor="middle" className="fill-slate-700 text-[11px] font-semibold">{edge.label}</text>
                      </g>
                    )
                  })}
                </svg>

                {config.canvasNodes.map((node) => {
                  const selected = selectedNodeId === node.id
                  const connecting = connectFromId === node.id
                  return (
                    <div
                      key={node.id}
                      role="button"
                      tabIndex={0}
                      onClick={() => handleNodeClick(node.id)}
                      onPointerDown={(event) => startDrag(event, node.id)}
                      onPointerMove={moveDrag}
                      onPointerUp={endDrag}
                      onPointerCancel={endDrag}
                      className={clsx(
                        "absolute select-none rounded-lg border bg-white p-3 shadow-sm transition",
                        canManage && canvasMode === "select" && "cursor-grab active:cursor-grabbing",
                        canvasMode === "connect" && "cursor-crosshair",
                        selected ? "border-[#006b68] ring-2 ring-[#006b68]/20" : "border-slate-200",
                        connecting && "border-sky-500 ring-2 ring-sky-200"
                      )}
                      style={{ left: node.x, top: node.y, width: nodeWidth, minHeight: nodeHeight }}
                    >
                      <div className="flex items-start gap-2">
                        <Grip className="mt-0.5 h-4 w-4 shrink-0 text-slate-300" />
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-bold text-slate-950" title={node.title}>{node.title}</p>
                          <p className="mt-1 w-fit rounded-md bg-emerald-50 px-2 py-1 text-[11px] font-semibold text-[#006b68]">{node.role}</p>
                        </div>
                      </div>
                      <div className="mt-2 flex flex-wrap gap-1">
                        {(node.bindings || []).slice(0, 3).map((binding) => (
                          <span key={binding.id} className="max-w-full truncate rounded bg-slate-100 px-1.5 py-0.5 text-[10px] font-semibold text-slate-500" title={`${bindingSourceLabels[binding.source]}: ${binding.label}`}>
                            {binding.label}
                          </span>
                        ))}
                        {(node.bindings || []).length > 3 && <span className="rounded bg-slate-100 px-1.5 py-0.5 text-[10px] font-semibold text-slate-500">+{(node.bindings || []).length - 3}</span>}
                      </div>
                    </div>
                  )
                })}
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
