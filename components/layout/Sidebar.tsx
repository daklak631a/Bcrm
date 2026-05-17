'use client'

import Link from "next/link"
import { usePathname } from "next/navigation"
import {
  Users,
  CreditCard,
  PiggyBank,
  PieChart,
  MessageSquare,
  Package,
  X
} from "lucide-react"

import { useAuthStore } from "@/store/useAuthStore"

interface SidebarProps {
  onClose?: () => void;
}

export function Sidebar({ onClose }: SidebarProps) {
  const pathname = usePathname()
  const { user } = useAuthStore()

  const links = [
    { href: "/dashboard", label: "Tổng Quan", icon: PieChart },
    { href: "/customers", label: "Khách Hàng", icon: Users },
    { href: "/loans", label: "Khoản Vay", icon: CreditCard },
    { href: "/deposits", label: "Tiền Gửi", icon: PiggyBank },
    { href: "/products", label: "Sản Phẩm Chéo", icon: Package },
    { href: "/reports", label: "Báo Cáo Tổng Hợp", icon: PieChart },
    { href: "/interactions", label: "Tương Tác", icon: MessageSquare },
  ]

  if (user?.role === 'ADMIN_LEVEL_1') {
    links.push({ href: "/team", label: "Phân Bổ Nhân Sự", icon: Users })
    links.push({ href: "/audit-logs", label: "Lịch Sử Hệ Thống", icon: Package })
  }

  return (
    <aside className="w-full h-full bg-slate-900 flex-shrink-0 flex flex-col text-slate-300">
      <div className="p-4 border-b border-slate-800 flex items-center justify-between">
        <div className="flex flex-col text-white">
          <span className="font-bold text-lg text-emerald-400">Nexus Banking CRM</span>
          <span className="text-xs text-slate-500 uppercase tracking-wider">Business Portal</span>
        </div>
        {onClose && (
          <button onClick={onClose} className="md:hidden p-1 text-slate-400 hover:text-white transition-colors">
            <X className="w-6 h-6" />
          </button>
        )}
      </div>
      <nav className="flex-1 p-4 space-y-2 overflow-y-auto">
        {links.map((link) => {
          const isActive = pathname === link.href || (pathname === '/' && link.href === '/dashboard')
          const Icon = link.icon
          return (
            <Link 
              key={link.href} 
              href={link.href} 
              onClick={onClose}
              className={`flex items-center gap-3 px-3 py-2 rounded-md transition-colors ${
                isActive ? "bg-emerald-500/10 text-emerald-400 font-medium" : "hover:bg-slate-800"
              }`}
            >
              <Icon className="w-5 h-5" /> {link.label}
            </Link>
          )
        })}
      </nav>
    </aside>
  )
}
