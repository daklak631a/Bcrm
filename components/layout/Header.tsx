import { Bell, Search, Menu, LogOut } from "lucide-react"
import { useAuthStore } from "@/store/useAuthStore"
import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"

interface HeaderProps {
  title?: string;
  onMenuClick?: () => void;
}

export function Header({ title = "Trang Tổng Quan CRM", onMenuClick }: HeaderProps) {
  const { user, logout } = useAuthStore()
  const [mounted, setMounted] = useState(false)
  const router = useRouter()

  // Avoid hydration mismatch for Zustand
  useEffect(() => {
    setMounted(true)
  }, [])

  const handleLogout = () => {
    logout()
    router.push('/login')
  }

  return (
    <header className="h-16 bg-white border-b flex items-center justify-between px-4 md:px-6 flex-shrink-0">
      <div className="flex items-center gap-3 overflow-hidden">
        <button onClick={onMenuClick} className="md:hidden text-slate-500 hover:text-slate-700 focus:outline-none shrink-0">
          <Menu className="w-6 h-6" />
        </button>
        <h1 className="text-lg md:text-xl font-semibold text-slate-800 truncate">{title}</h1>
      </div>
      <div className="flex items-center gap-2 md:gap-4 shrink-0">
        <div className="relative hidden md:block">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input type="text" placeholder="Tìm kiếm khách hàng..." className="pl-9 pr-4 py-2 bg-slate-100 rounded-md text-sm border-none focus:ring-2 focus:ring-emerald-500 w-64" />
        </div>
        <button className="md:hidden p-2 text-slate-400 hover:text-slate-600 transition-colors">
          <Search className="w-5 h-5" />
        </button>
        
        <button className="relative p-2 text-slate-400 hover:text-slate-600 transition-colors">
          <Bell className="w-5 h-5" />
          <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-rose-500 rounded-full"></span>
        </button>
        <div className="flex items-center gap-2 md:gap-3 pl-2 md:pl-4 border-l border-slate-200">
          <div className="w-8 h-8 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-700 font-bold text-sm shrink-0">
            {mounted && user ? user.name.charAt(0) : 'U'}
          </div>
          <div className="hidden md:block">
            <p className="text-sm font-medium text-slate-700">{mounted && user ? user.name : 'Đang tải...'}</p>
            <p className="text-xs text-slate-500">
              {mounted && user?.role === 'admin_1' ? 'Hội Sở Chính' : 
               mounted && user?.role === 'admin_2' ? 'Quản lý Chi Nhánh 1' : 'Chi Nhánh 1'}
            </p>
          </div>
          <button onClick={handleLogout} className="p-2 ml-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-md transition-colors" title="Đăng xuất">
            <LogOut className="w-5 h-5" />
          </button>
        </div>
      </div>
    </header>
  )
}
