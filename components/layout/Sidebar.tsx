"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { fetchSystemSettings } from "@/lib/supabase/api"
import {
  ClipboardList,
  MessageSquare,
  Network,
  Package,
  PieChart,
  Settings,
  Shield,
  ShoppingCart,
  Target,
  Users,
  X,
} from "lucide-react"
import { useAuthStore } from "@/store/useAuthStore"
import { getErrorMessage } from "@/lib/errors"
import { logger } from "@/lib/logger"

interface SidebarProps {
  onClose?: () => void
}

type SidebarLink = {
  href: string
  label: string
  icon: typeof PieChart
  children?: SidebarLink[]
}

export function Sidebar({ onClose }: SidebarProps) {
  const pathname = usePathname()
  const { user } = useAuthStore()
  const [logoUrl, setLogoUrl] = useState("")
  const [appName, setAppName] = useState("Nexus Banking CRM")

  useEffect(() => {
    const loadSettings = async () => {
      try {
        const settings = await fetchSystemSettings()
        const logo = settings.find((setting) => setting.key === "logo_url")?.value
        const name = settings.find((setting) => setting.key === "app_name")?.value
        if (logo) setLogoUrl(logo)
        if (name) setAppName(name)
      } catch (err) {
        logger.warn("[Sidebar] Failed to load logo", { error: getErrorMessage(err) })
      }
    }
    loadSettings()
    window.addEventListener("storage", loadSettings)
    return () => window.removeEventListener("storage", loadSettings)
  }, [])

  let links: SidebarLink[] = [
    { href: "/dashboard", label: "Tổng Quan", icon: PieChart },
    { href: "/sales-support", label: "Kanban Bán Hàng", icon: ClipboardList },
    { href: "/advanced-workflow-pilot", label: "Dự Án", icon: Network },
    { href: "/sales", label: "Bảng Bán Hàng", icon: ShoppingCart },
    { href: "/customers", label: "Khách Hàng", icon: Users },
    { href: "/reports", label: "Báo Cáo Tổng Hợp", icon: PieChart },
    { href: "/interactions", label: "Tương Tác", icon: MessageSquare },
  ]

  if (user?.role === "ADMIN_LEVEL_0") {
    links = [
      {
        href: "/workflow-config",
        label: "Cấu Hình Hệ Thống",
        icon: Settings,
        children: [
          { href: "/workflow-config", label: "Workflow Chung", icon: Network },
          { href: "/advanced-workflow-pilot/templates", label: "Template Dự Án", icon: ClipboardList },
          { href: "/audit-logs", label: "Lịch Sử Hệ Thống", icon: Package },
          { href: "/settings", label: "Thiết Lập Chung", icon: Settings },
        ],
      },
    ]
  } else {
    if (user?.role !== "USER" && user?.role !== "ADVISOR") {
      links.splice(3, 0, { href: "/products", label: "Danh Mục Sản Phẩm", icon: Package })
    }

    const configChildren: SidebarLink[] = []

    if (user?.role === "ADMIN_LEVEL_1" || user?.role === "ADMIN_LEVEL_2") {
      configChildren.push({ href: "/advanced-workflow-pilot/templates", label: "Template Dự Án", icon: ClipboardList })
    }

    if (["ADMIN_LEVEL_1", "ADVISOR"].includes(user?.role || "")) {
      configChildren.push({ href: "/team", label: "Phân Bổ Nhân Sự", icon: Users })
    }

    if (user?.role === "ADMIN_LEVEL_2") {
      configChildren.push({ href: "/team", label: "Đội Ngũ Chi Nhánh", icon: Users })
    }

    if (user?.role === "ADMIN_LEVEL_1") {
      configChildren.push({ href: "/audit-logs", label: "Lịch Sử Hệ Thống", icon: Package })
      configChildren.push({ href: "/settings", label: "Thiết Lập Chung", icon: Settings })
    }

    if (configChildren.length > 0) {
      links.push({ href: "/settings", label: "Cấu Hình Hệ Thống", icon: Settings, children: configChildren })
    }

    if (user?.role === "ADMIN_LEVEL_1" || user?.role === "ADMIN_LEVEL_2") {
      links.push({ href: "/kpi-targets", label: "KPI Mục Tiêu", icon: Target })
      links.push({ href: "/team/delegations", label: "Ủy Quyền Phó Phòng", icon: Shield })
    }
  }

  return (
    <aside className="flex h-full w-full flex-shrink-0 flex-col bg-gradient-to-b from-[#003836] via-[#002b29] to-[#001716] text-slate-300">
      <div className="flex items-center justify-between border-b border-[#004744]/70 p-4">
        <div className="mr-2 flex min-w-0 flex-1 items-center gap-2.5 text-white">
          {logoUrl && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={logoUrl} alt="Logo" className="max-h-9 w-auto shrink-0 object-contain" />
          )}
          <div className="flex min-w-0 flex-col">
            <span className="truncate text-base font-bold text-[#33b7ab]">{appName}</span>
            <span className="text-[9px] font-semibold uppercase tracking-wider text-slate-400">Business Portal</span>
          </div>
        </div>
        {onClose && (
          <button onClick={onClose} className="shrink-0 p-1 text-slate-400 transition-colors hover:text-white md:hidden">
            <X className="h-6 w-6" />
          </button>
        )}
      </div>

      <nav className="flex-1 space-y-1.5 overflow-y-auto p-4">
        {links.map((link) => {
          const childActive = link.children?.some((child) => pathname === child.href || pathname.startsWith(`${child.href}/`))
          const isActive = pathname === link.href || (pathname === "/" && link.href === "/dashboard") || Boolean(childActive)
          const Icon = link.icon

          return (
            <div key={link.href}>
              <Link
                href={link.href}
                onClick={onClose}
                className={`flex items-center gap-3 rounded-xl px-3.5 py-2.5 transition-all ${
                  isActive
                    ? "bg-gradient-to-r from-[#006b68] to-[#005451] font-semibold text-white shadow-md shadow-[#001716]/40"
                    : "hover:bg-[#004744]/40 hover:text-slate-100"
                }`}
              >
                <Icon className="h-5 w-5 shrink-0" />
                {link.label}
              </Link>

              {link.children && isActive && (
                <div className="mt-1 space-y-1 pl-6">
                  {link.children.map((child) => {
                    const ChildIcon = child.icon
                    const isChildActive = pathname === child.href || pathname.startsWith(`${child.href}/`)
                    return (
                      <Link
                        key={child.href}
                        href={child.href}
                        onClick={onClose}
                        className={`flex items-center gap-2 rounded-lg px-3 py-2 text-sm transition-all ${
                          isChildActive ? "bg-[#004744] font-semibold text-white" : "text-slate-400 hover:bg-[#004744]/40 hover:text-slate-100"
                        }`}
                      >
                        <ChildIcon className="h-4 w-4 shrink-0" />
                        {child.label}
                      </Link>
                    )
                  })}
                </div>
              )}
            </div>
          )
        })}
      </nav>
    </aside>
  )
}
