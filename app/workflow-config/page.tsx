"use client"

import { useEffect, useMemo, useState } from "react"
import clsx from "clsx"
import { Plus, Save, Trash2, Workflow } from "lucide-react"
import { DashboardLayout } from "@/components/layout/DashboardLayout"
import { useAuthStore } from "@/store/useAuthStore"
import { ConfigCategoryKey, ConfigOption, WorkflowConfig, defaultWorkflowConfig, getWorkflowConfig, saveWorkflowConfig } from "@/lib/workflow-config"

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

export default function WorkflowConfigPage() {
  const { user } = useAuthStore()
  const [mounted, setMounted] = useState(false)
  const [config, setConfig] = useState<WorkflowConfig>(defaultWorkflowConfig)
  const [activeKey, setActiveKey] = useState<ConfigCategoryKey>("salesGroups")
  const canManage = user?.role === "ADMIN_LEVEL_0"

  useEffect(() => {
    setMounted(true)
    setConfig(getWorkflowConfig())
  }, [])

  const activeOptions = config.categories[activeKey] || []
  const selectedNode = useMemo(() => config.canvasNodes.find((node) => node.role === "ADMIN_LEVEL_0"), [config.canvasNodes])

  const updateOptions = (rows: ConfigOption[]) => {
    setConfig((current) => ({
      ...current,
      categories: { ...current.categories, [activeKey]: rows },
    }))
  }

  const save = () => saveWorkflowConfig(config)

  if (!mounted) return null

  return (
    <DashboardLayout title="Cấu Hình Workflow">
      <div className="space-y-5">
        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#006b68]">Admin LV0</p>
              <h1 className="mt-2 text-2xl font-bold text-slate-950">Cấu hình luồng quy trình chung</h1>
              <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">
                Admin LV0 cấu hình droplist, canvas workflow và quyền thao tác chung cho user/admin. Phần dự án/template dự án vẫn nằm ở khu vực Dự Án riêng.
              </p>
            </div>
            <button
              type="button"
              onClick={save}
              disabled={!canManage}
              className="inline-flex h-10 items-center gap-2 rounded-lg bg-[#006b68] px-4 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50"
            >
              <Save className="h-4 w-4" />
              Lưu cấu hình
            </button>
          </div>
          {!canManage && (
            <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
              Chỉ Admin LV0 được thêm, sửa, xóa cấu hình workflow/droplist chung.
            </div>
          )}
        </section>

        <section className="grid gap-5 xl:grid-cols-[360px_minmax(0,1fr)]">
          <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">Droplist hệ thống</p>
            <div className="mt-3 grid gap-2">
              {categoryKeys.map((key) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => setActiveKey(key)}
                  className={clsx(
                    "flex items-center justify-between rounded-xl border px-3 py-2 text-left text-sm font-semibold transition",
                    activeKey === key ? "border-[#006b68] bg-emerald-50 text-[#006b68]" : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
                  )}
                >
                  {categoryLabels[key]}
                  <span className="rounded-md bg-slate-100 px-2 py-0.5 text-xs text-slate-500">{config.categories[key].length}</span>
                </button>
              ))}
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">Đang cấu hình</p>
                <h2 className="mt-1 text-lg font-bold text-slate-950">{categoryLabels[activeKey]}</h2>
              </div>
              <button
                type="button"
                disabled={!canManage}
                onClick={() => updateOptions([...activeOptions, { id: `${activeKey}-${Date.now()}`, label: "Mục mới", value: "OTHER_VALUE", active: true }])}
                className="inline-flex h-9 items-center gap-2 rounded-lg border border-[#006b68] px-3 text-sm font-semibold text-[#006b68] disabled:opacity-40"
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

        <section className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_380px]">
          <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="flex items-center gap-2">
              <Workflow className="h-5 w-5 text-[#006b68]" />
              <h2 className="text-lg font-bold text-slate-950">Canvas workflow quyền thao tác</h2>
            </div>
            <div className="relative mt-4 h-[360px] overflow-hidden rounded-2xl border border-slate-200 bg-[radial-gradient(circle_at_1px_1px,#cbd5e1_1px,transparent_0)] [background-size:24px_24px]">
              {config.canvasEdges.map((edge) => {
                const from = config.canvasNodes.find((node) => node.id === edge.from)
                const to = config.canvasNodes.find((node) => node.id === edge.to)
                if (!from || !to) return null
                return (
                  <div
                    key={`${edge.from}-${edge.to}`}
                    className="absolute h-0.5 origin-left bg-[#006b68]/50"
                    style={{
                      left: from.x + 140,
                      top: from.y + 34,
                      width: Math.max(80, to.x - from.x - 80),
                    }}
                    title={edge.label}
                  />
                )
              })}
              {config.canvasNodes.map((node) => (
                <div
                  key={node.id}
                  className="absolute w-[190px] rounded-2xl border border-[#006b68]/30 bg-white p-3 shadow-sm"
                  style={{ left: node.x, top: node.y }}
                >
                  <p className="text-sm font-bold text-slate-950">{node.title}</p>
                  <p className="mt-1 rounded-md bg-emerald-50 px-2 py-1 text-xs font-semibold text-[#006b68]">{node.role}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">Ma trận quyền mẫu</p>
            <div className="mt-3 space-y-3">
              {config.roleRules.map((rule, index) => (
                <div key={rule.role} className={clsx("rounded-xl border p-3", selectedNode?.role === rule.role ? "border-[#006b68] bg-emerald-50" : "border-slate-200 bg-slate-50")}>
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
                    className="mt-2 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs leading-5 outline-none disabled:bg-slate-100"
                  />
                </div>
              ))}
            </div>
          </div>
        </section>
      </div>
    </DashboardLayout>
  )
}

function OptionRow({ option, disabled, onChange, onDelete }: { option: ConfigOption; disabled: boolean; onChange: (patch: Partial<ConfigOption>) => void; onDelete: () => void }) {
  return (
    <div className="grid gap-2 rounded-xl border border-slate-200 bg-slate-50 p-3 md:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto_auto]">
      <input disabled={disabled} value={option.label} onChange={(event) => onChange({ label: event.target.value })} className="h-10 rounded-lg border border-slate-200 bg-white px-3 text-sm outline-none disabled:bg-slate-100" />
      <input disabled={disabled} value={option.value} onChange={(event) => onChange({ value: event.target.value })} className="h-10 rounded-lg border border-slate-200 bg-white px-3 text-sm font-mono outline-none disabled:bg-slate-100" />
      <label className="flex h-10 items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-600">
        <input disabled={disabled} type="checkbox" checked={option.active} onChange={(event) => onChange({ active: event.target.checked })} />
        Hiện
      </label>
      <button type="button" disabled={disabled} onClick={onDelete} className="inline-flex h-10 items-center justify-center rounded-lg border border-rose-200 px-3 text-rose-600 disabled:opacity-40">
        <Trash2 className="h-4 w-4" />
      </button>
    </div>
  )
}
