"use client"

import clsx from "clsx"
import Link from "next/link"
import { useCallback, useEffect, useMemo, useState } from "react"
import { toast } from "sonner"
import {
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  Clock3,
  Loader2,
  MessageSquare,
  Package,
  UserRound,
  UsersRound,
  type LucideIcon,
} from "lucide-react"
import { useAuthStore } from "@/store/useAuthStore"
import {
  fetchInteractions,
  fetchProfiles,
  fetchSalesRecords,
  getCustomerFullName,
  updateInteraction,
  updateProductSale,
} from "@/lib/supabase/api"

type KanbanStatus = "OVERDUE" | "PENDING" | "FOLLOW_UP" | "UNALLOCATED" | "DONE"
type WorkSourceType = "INTERACTION" | "PRODUCT" | "BATCH_GROUP"

interface WorkItem {
  id: string
  sourceId: string
  sourceType: WorkSourceType
  statusKey: KanbanStatus
  ownerId: string | null
  ownerName: string
  title: string
  customerName: string
  href: string
  salesHref: string | null
  date?: string | null
  badge: string
  tone: "rose" | "amber" | "teal" | "sky"
  icon: LucideIcon
  recordCount?: number
}

const KANBAN_COLUMNS: Array<{
  key: KanbanStatus
  title: string
  description: string
  icon: LucideIcon
  tone: string
  rail: string
}> = [
  {
    key: "OVERDUE",
    title: "Quá hẹn",
    description: "Ưu tiên xử lý trong ngày.",
    icon: AlertTriangle,
    tone: "border-rose-200 bg-rose-50 text-rose-700",
    rail: "from-rose-500 to-orange-400",
  },
  {
    key: "PENDING",
    title: "Đang xử lý",
    description: "Việc đang mở trong pipeline.",
    icon: Clock3,
    tone: "border-amber-200 bg-amber-50 text-amber-700",
    rail: "from-amber-400 to-yellow-300",
  },
  {
    key: "FOLLOW_UP",
    title: "Cần theo dõi",
    description: "Đã liên hệ, cần chăm lại.",
    icon: MessageSquare,
    tone: "border-teal-200 bg-teal-50 text-teal-700",
    rail: "from-[#006b68] to-teal-400",
  },
  {
    key: "UNALLOCATED",
    title: "Chờ phân bổ",
    description: "Gom nhập lô theo người nhập.",
    icon: Package,
    tone: "border-sky-200 bg-sky-50 text-sky-700",
    rail: "from-sky-500 to-cyan-300",
  },
  {
    key: "DONE",
    title: "Hoàn thành",
    description: "Thả vào đây để chốt.",
    icon: CheckCircle2,
    tone: "border-emerald-200 bg-emerald-50 text-emerald-700",
    rail: "from-emerald-500 to-lime-300",
  },
]

function getToneClass(tone: WorkItem["tone"]) {
  switch (tone) {
    case "rose":
      return "bg-rose-50 text-rose-700 border-rose-100"
    case "sky":
      return "bg-sky-50 text-sky-700 border-sky-100"
    case "teal":
      return "bg-teal-50 text-teal-700 border-teal-100"
    default:
      return "bg-amber-50 text-amber-700 border-amber-100"
  }
}

export function SalesSupportKanban() {
  const { user } = useAuthStore()
  const [loading, setLoading] = useState(true)
  const [profiles, setProfiles] = useState<any[]>([])
  const [workItems, setWorkItems] = useState<WorkItem[]>([])
  const [draggingItemId, setDraggingItemId] = useState<string | null>(null)
  const [activeColumn, setActiveColumn] = useState<KanbanStatus | null>(null)
  const [updatingItemId, setUpdatingItemId] = useState<string | null>(null)

  const loadData = useCallback(async () => {
    try {
      setLoading(true)
      const [salesRecords, interactions, profilesData] = await Promise.all([
        fetchSalesRecords(),
        fetchInteractions(),
        fetchProfiles(),
      ])

      const profileById = new Map(profilesData.map((profile: any) => [profile.id, profile]))
      const today = new Date()
      today.setHours(0, 0, 0, 0)

      const isPastDate = (value?: string | null) => {
        if (!value) return false
        const date = new Date(value)
        if (Number.isNaN(date.getTime())) return false
        date.setHours(0, 0, 0, 0)
        return date < today
      }

      const getOwnerName = (ownerId?: string | null) => {
        if (!ownerId) return "Chưa rõ phụ trách"
        return profileById.get(ownerId)?.full_name || "Chưa rõ phụ trách"
      }

      const interactionItems: WorkItem[] = interactions
        .filter((interaction: any) => interaction.result === "PENDING" || interaction.result === "FOLLOW_UP")
        .map((interaction: any) => {
          const dueDate = interaction.follow_up_date || interaction.interaction_date
          const overdue = isPastDate(dueDate)
          return {
            id: `interaction:${interaction.id}`,
            sourceId: interaction.id,
            sourceType: "INTERACTION",
            statusKey: overdue ? "OVERDUE" : interaction.result,
            ownerId: interaction.manager_id,
            ownerName: getOwnerName(interaction.manager_id),
            title: interaction.purpose || "Tương tác cần xử lý",
            customerName: interaction.customers ? getCustomerFullName(interaction.customers) : "—",
            href: interaction.customer_id ? `/interactions?customerId=${interaction.customer_id}` : "/interactions",
            salesHref: interaction.customer_id ? `/sales?create=1&type=PRODUCT&customerId=${interaction.customer_id}` : null,
            date: dueDate,
            badge: overdue ? "Quá hẹn" : interaction.result === "FOLLOW_UP" ? "Theo dõi" : "Đang chờ",
            tone: overdue ? "rose" : interaction.result === "FOLLOW_UP" ? "teal" : "amber",
            icon: overdue ? AlertTriangle : MessageSquare,
          }
        })

      const productItems: WorkItem[] = salesRecords
        .filter((sale: any) => sale.source_type === "PRODUCT" && !sale.raw?.is_batch_entry && (sale.status === "PENDING" || sale.status === "INTERESTED"))
        .map((sale: any) => ({
          id: `sale:${sale.id}`,
          sourceId: sale.source_id,
          sourceType: "PRODUCT",
          statusKey: sale.status === "INTERESTED" ? "FOLLOW_UP" : "PENDING",
          ownerId: sale.agent_id,
          ownerName: getOwnerName(sale.agent_id),
          title: sale.title || "Giao dịch cần xử lý",
          customerName: sale.customer_name || "—",
          href: sale.source_href || "/sales",
          salesHref: null,
          date: sale.sale_date,
          badge: sale.status === "INTERESTED" ? "Quan tâm" : "Đang xử lý",
          tone: sale.status === "INTERESTED" ? "teal" : "amber",
          icon: Package,
        }))

      const batchGroups = new Map<string, any[]>()
      salesRecords
        .filter((sale: any) => sale.raw?.is_batch_entry && !sale.raw?.is_allocated)
        .forEach((sale: any) => {
          const ownerKey = sale.agent_id || "unknown"
          batchGroups.set(ownerKey, [...(batchGroups.get(ownerKey) || []), sale])
        })

      const batchItems: WorkItem[] = Array.from(batchGroups.entries()).map(([ownerId, records]) => {
        const latestDate = records
          .map((record) => record.sale_date || record.created_at)
          .filter(Boolean)
          .sort()
          .at(-1)

        return {
          id: `batch:${ownerId}`,
          sourceId: ownerId,
          sourceType: "BATCH_GROUP",
          statusKey: "UNALLOCATED",
          ownerId: ownerId === "unknown" ? null : ownerId,
          ownerName: getOwnerName(ownerId),
          title: `${records.length} bản ghi nhập lô chờ phân bổ`,
          customerName: "Nhập lô cuối ngày",
          href: "/sales/batch-allocate",
          salesHref: null,
          date: latestDate,
          badge: "Cần phân bổ",
          tone: "sky",
          icon: Package,
          recordCount: records.length,
        }
      })

      setProfiles(profilesData)
      setWorkItems([...interactionItems, ...productItems, ...batchItems].sort((a, b) => {
        const aTime = a.date ? new Date(a.date).getTime() : 0
        const bTime = b.date ? new Date(b.date).getTime() : 0
        return aTime - bTime
      }))
    } catch (err: any) {
      toast.error("Không tải được kanban: " + err.message)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadData()
  }, [loadData])

  const departmentUserIds = useMemo(() => {
    if (!user?.department_id) return new Set<string>()
    return new Set(profiles.filter((profile: any) => profile.department_id === user.department_id).map((profile: any) => profile.id))
  }, [profiles, user?.department_id])

  const visibleItems = useMemo(() => {
    if (user?.role === "ADMIN_LEVEL_1") return workItems
    if (user?.role === "ADMIN_LEVEL_2") return workItems.filter((item) => !!item.ownerId && departmentUserIds.has(item.ownerId))
    return workItems.filter((item) => item.ownerId === user?.id)
  }, [departmentUserIds, user?.id, user?.role, workItems])

  const personalCount = visibleItems.filter((item) => item.ownerId === user?.id).length

  const getColumnItems = (status: KanbanStatus) => {
    if (status === "DONE") return []
    return visibleItems.filter((item) => item.statusKey === status)
  }

  const canMoveItem = (item: WorkItem) => {
    if (item.sourceType === "BATCH_GROUP") return false
    return user?.role !== "USER" || item.ownerId === user?.id
  }

  const moveItemOptimistically = (item: WorkItem, nextStatus: KanbanStatus) => {
    const today = new Date().toISOString().slice(0, 10)
    setWorkItems((current) => {
      if (nextStatus === "DONE") return current.filter((entry) => entry.id !== item.id)
      return current.map((entry) => entry.id === item.id
        ? {
            ...entry,
            statusKey: nextStatus,
            badge: nextStatus === "FOLLOW_UP" ? "Theo dõi" : "Đang xử lý",
            tone: nextStatus === "FOLLOW_UP" ? "teal" : "amber",
            date: entry.statusKey === "OVERDUE" ? today : entry.date,
          }
        : entry)
    })
  }

  const handleDropToColumn = async (status: KanbanStatus) => {
    if (!draggingItemId) return
    const item = visibleItems.find((entry) => entry.id === draggingItemId)
    setDraggingItemId(null)
    setActiveColumn(null)
    if (!item || item.statusKey === status || !canMoveItem(item)) return

    const previousItems = workItems
    moveItemOptimistically(item, status)

    try {
      setUpdatingItemId(item.id)
      if (item.sourceType === "INTERACTION") {
        const nextResult = status === "DONE" ? "SUCCESS" : status === "FOLLOW_UP" ? "FOLLOW_UP" : "PENDING"
        const nextUpdates: Record<string, any> = { result: nextResult }
        if (item.statusKey === "OVERDUE" && status !== "DONE") {
          nextUpdates.follow_up_date = new Date().toISOString().slice(0, 10)
        }
        await updateInteraction(item.sourceId, nextUpdates)
      } else if (item.sourceType === "PRODUCT") {
        const nextStatus = status === "DONE" ? "COMPLETED" : status === "FOLLOW_UP" ? "INTERESTED" : "PENDING"
        await updateProductSale(item.sourceId, { status: nextStatus })
      }
      toast.success(status === "DONE" ? "Đã chốt hoàn thành." : "Đã cập nhật trạng thái.")
    } catch (err: any) {
      setWorkItems(previousItems)
      toast.error("Không cập nhật được trạng thái: " + err.message)
    } finally {
      setUpdatingItemId(null)
    }
  }

  const WorkItemCard = ({ item }: { item: WorkItem }) => {
    const Icon = item.icon
    const toneClass = getToneClass(item.tone)

    return (
      <article
        draggable={canMoveItem(item) && updatingItemId !== item.id}
        onDragStart={(event) => {
          event.dataTransfer.effectAllowed = "move"
          setDraggingItemId(item.id)
        }}
        onDragEnd={() => {
          setDraggingItemId(null)
          setActiveColumn(null)
        }}
        className={clsx(
          "group rounded-2xl border border-slate-100 bg-white p-4 shadow-sm transition-[transform,box-shadow,opacity] duration-200 hover:-translate-y-0.5 hover:shadow-lg",
          canMoveItem(item) ? "cursor-grab active:cursor-grabbing" : "cursor-default",
          draggingItemId === item.id && "scale-[0.97] opacity-50",
          updatingItemId === item.id && "pointer-events-none opacity-60"
        )}
      >
        <Link href={item.href} className="block">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-2">
              <span className={clsx("flex h-9 w-9 items-center justify-center rounded-xl border", toneClass)}>
                <Icon className="h-4 w-4" />
              </span>
              <span className={clsx("rounded-full border px-2 py-0.5 text-[11px] font-semibold", toneClass)}>{item.badge}</span>
            </div>
            <ArrowRight className="h-4 w-4 text-slate-300 transition group-hover:translate-x-0.5 group-hover:text-slate-500" />
          </div>
          <h3 className="mt-3 line-clamp-2 text-sm font-semibold leading-5 text-slate-900">{item.title}</h3>
          <p className="mt-2 text-xs text-slate-500">KH: <b>{item.customerName}</b></p>
          <p className="mt-1 text-xs text-slate-400">Phụ trách: {item.ownerName}</p>
          {item.recordCount && <p className="mt-1 text-xs text-sky-600">Tổng {item.recordCount} dòng nhập lô</p>}
          {item.date && <p className="mt-1 text-xs text-slate-400">Hạn/Ngày: {new Date(item.date).toLocaleDateString("vi-VN")}</p>}
        </Link>
        {item.salesHref && (
          <Link href={item.salesHref} className="mt-3 inline-flex w-full items-center justify-center rounded-xl bg-[#006b68] px-3 py-2 text-xs font-semibold text-white transition hover:bg-[#005451]">
            Ghi nhận SP bán
          </Link>
        )}
      </article>
    )
  }

  const WorkColumn = ({ column, items }: { column: (typeof KANBAN_COLUMNS)[number]; items: WorkItem[] }) => {
    const Icon = column.icon
    const isDropTarget = draggingItemId !== null && activeColumn === column.key

    return (
      <section
        onDragOver={(event) => {
          event.preventDefault()
          setActiveColumn(column.key)
        }}
        onDragLeave={(event) => {
          if (!event.currentTarget.contains(event.relatedTarget as Node)) setActiveColumn(null)
        }}
        onDrop={() => handleDropToColumn(column.key)}
        className={clsx(
          "relative flex min-h-[460px] flex-col rounded-[26px] border bg-slate-50/80 p-4 transition duration-200",
          isDropTarget ? "scale-[1.01] border-dashed border-[#006b68]/60 bg-teal-50/50 shadow-lg shadow-teal-900/5" : "border-slate-200"
        )}
      >
        <div className={clsx("absolute inset-x-4 top-3 h-1 rounded-full bg-gradient-to-r", column.rail)} />
        <div className="mb-4 mt-3 flex items-start justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <span className={clsx("flex h-8 w-8 items-center justify-center rounded-xl border", column.tone)}>
                <Icon className="h-4 w-4" />
              </span>
              <h3 className="text-sm font-bold text-slate-900">{column.title}</h3>
            </div>
            <p className="mt-1 text-xs leading-5 text-slate-500">{column.description}</p>
          </div>
          <span className="rounded-full bg-white px-2.5 py-1 text-xs font-bold text-slate-700 ring-1 ring-slate-200">{items.length}</span>
        </div>
        <div className="flex-1 space-y-3">
          {items.map((item) => <WorkItemCard key={item.id} item={item} />)}
          {items.length === 0 && (
            <div className="rounded-2xl border border-dashed border-slate-200 bg-white/70 p-5 text-center text-sm leading-6 text-slate-500">
              {column.key === "DONE" ? "Kéo thẻ vào đây để chốt hoàn thành." : "Không có thẻ ở trạng thái này."}
            </div>
          )}
        </div>
      </section>
    )
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-32">
        <Loader2 className="h-8 w-8 animate-spin text-[#006b68]" />
        <span className="ml-3 text-slate-500">Đang tải kanban...</span>
      </div>
    )
  }

  return (
    <div className="rounded-[30px] bg-white p-5 shadow-sm ring-1 ring-slate-900/5">
      <div className="mb-5 flex flex-col justify-between gap-4 md:flex-row md:items-end">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.22em] text-[#006b68]">Sales support board</p>
          <h2 className="mt-1 text-2xl font-semibold tracking-tight text-slate-950">Kanban việc dang dở & cảnh báo bán hàng</h2>
          <p className="mt-1 max-w-3xl text-sm text-slate-500">
            Kéo thả để đổi trạng thái tức thì, không reload trang. Nhập lô cuối ngày được gom theo người phụ trách để dễ phân bổ.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-2 rounded-2xl bg-amber-50 px-3 py-2 text-sm font-semibold text-amber-700 ring-1 ring-amber-100">
            <UserRound className="h-4 w-4" />
            {personalCount} việc của tôi
          </div>
          {user?.role === "ADMIN_LEVEL_2" && (
            <div className="flex items-center gap-2 rounded-2xl bg-teal-50 px-3 py-2 text-sm font-semibold text-teal-700 ring-1 ring-teal-100">
              <UsersRound className="h-4 w-4" />
              {visibleItems.length} việc cả phòng
            </div>
          )}
          {user?.role === "ADMIN_LEVEL_1" && (
            <div className="flex items-center gap-2 rounded-2xl bg-teal-50 px-3 py-2 text-sm font-semibold text-teal-700 ring-1 ring-teal-100">
              <UsersRound className="h-4 w-4" />
              {visibleItems.length} việc toàn hệ thống
            </div>
          )}
        </div>
      </div>
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
        {KANBAN_COLUMNS.map((column) => (
          <WorkColumn key={column.key} column={column} items={getColumnItems(column.key)} />
        ))}
      </div>
    </div>
  )
}
