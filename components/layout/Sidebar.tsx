"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { fetchSystemSettings } from "@/lib/supabase/api"
import {
  Users,
  PieChart,
  MessageSquare,
  Package,
  ShoppingCart,
  Target,
  X,
  Settings
} from "lucide-react"

import { useAuthStore } from "@/store/useAuthStore"

interface SidebarProps {
  onClose?: () => void;
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
        const logo = settings.find(s => s.key === 'logo_url')?.value
        const name = settings.find(s => s.key === 'app_name')?.value
        if (logo) setLogoUrl(logo)
        if (name) setAppName(name)
      } catch (err) {
        console.warn("Failed to load logo in Sidebar:", err)
      }
    }
    loadSettings()
    window.addEventListener('storage', loadSettings)
    return () => window.removeEventListener('storage', loadSettings)
  }, [])

  const links = [
    { href: "/dashboard", label: "Tổng Quan", icon: PieChart },
    { href: "/sales", label: "Bảng Bán Hàng", icon: ShoppingCart },
    { href: "/customers", label: "Khách Hàng", icon: Users },
    { href: "/products", label: "Danh Mục Sản Phẩm", icon: Package },
    { href: "/reports", label: "Báo Cáo Tổng Hợp", icon: PieChart },
    { href: "/interactions", label: "Tương Tác", icon: MessageSquare },
  ]

  if (user?.role === 'ADMIN_LEVEL_1') {
    links.push({ href: "/team", label: "Phân Bổ Nhân Sự", icon: Users })
    links.push({ href: "/audit-logs", label: "Lịch Sử Hệ Thống", icon: Package })
    links.push({ href: "/settings", label: "Cấu Hình Hệ Thống", icon: Settings })
  }

  if (user?.role === 'ADMIN_LEVEL_1' || user?.role === 'ADMIN_LEVEL_2') {
    links.push({ href: "/kpi-targets", label: "KPI Mục Tiêu", icon: Target })
  }

  return (
    <aside className="w-full h-full bg-gradient-to-b from-[#003836] via-[#002b29] to-[#001716] flex-shrink-0 flex flex-col text-slate-300">
      <div className="p-4 border-b border-[#004744]/70 flex items-center justify-between">
        <div className="flex items-center gap-2.5 text-white">
          {logoUrl ? (
            /* eslint-disable-next-line @next/next/no-img-element */
            <img src={logoUrl} alt="Logo" className="max-h-9 object-contain" />
          ) : (
            <div className="flex flex-col">
              <span className="font-bold text-lg text-[#33b7ab]">{appName}</span>
              <span className="text-[10px] text-slate-400 uppercase tracking-wider font-semibold">Business Portal</span>
            </div>
          )}
        </div>
        {onClose && (
          <button onClick={onClose} className="md:hidden p-1 text-slate-400 hover:text-white transition-colors">
            <X className="w-6 h-6" />
          </button>
        )}
      </div>
      <nav className="flex-1 p-4 space-y-1.5 overflow-y-auto">
        {links.map((link) => {
          const isActive = pathname === link.href || (pathname === '/' && link.href === '/dashboard')
          const Icon = link.icon
          return (
            <Link 
              key={link.href} 
              href={link.href} 
              onClick={onClose}
              className={`flex items-center gap-3 px-3.5 py-2.5 rounded-xl transition-all ${
                isActive ? "bg-gradient-to-r from-[#006b68] to-[#005451] text-white font-semibold shadow-md shadow-[#001716]/40" : "hover:bg-[#004744]/40 hover:text-slate-100"
              }`}
            >
              <Icon className="w-5 h-5 shrink-0" /> {link.label}
            </Link>
          )
        })}
      </nav>
    </aside>
  )
}
