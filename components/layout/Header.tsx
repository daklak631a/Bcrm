'use client'

import { Bell, Menu, LogOut, Check, Loader2, PanelLeftClose, PanelLeftOpen } from "lucide-react"
import { useAuthStore } from "@/store/useAuthStore"
import { useEffect, useState, useRef, useCallback } from "react"
import { useRouter } from "next/navigation"
import { fetchNotifications, markNotificationRead, markAllNotificationsRead } from "@/lib/supabase/api"
import { getSupabase } from "@/lib/supabase/client"

interface HeaderProps {
  title?: string;
  onMenuClick?: () => void;
  isDesktopSidebarOpen?: boolean;
  onDesktopSidebarToggle?: () => void;
}

export function Header({
  title = "Trang Tổng Quan CRM",
  onMenuClick,
  isDesktopSidebarOpen = true,
  onDesktopSidebarToggle,
}: HeaderProps) {
  const { user, logout } = useAuthStore()
  const [mounted, setMounted] = useState(false)
  const router = useRouter()
  const [showNotifications, setShowNotifications] = useState(false)
  const [notifications, setNotifications] = useState<any[]>([])
  const [notifLoading, setNotifLoading] = useState(false)
  const notifRef = useRef<HTMLDivElement>(null)

  useEffect(() => { setMounted(true) }, [])

  // Close on outside click
  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (notifRef.current && !notifRef.current.contains(e.target as Node)) {
        setShowNotifications(false)
      }
    }
    if (showNotifications) document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [showNotifications])

  const loadNotifications = useCallback(async () => {
    if (!user?.id) return
    try {
      setNotifLoading(true)
      const data = await fetchNotifications(user.id)
      setNotifications(data)
    } catch (err) {
      console.error('Failed to load notifications:', err)
    } finally {
      setNotifLoading(false)
    }
  }, [user?.id])

  useEffect(() => {
    if (user?.id) {
      loadNotifications()
      
      const supabase = getSupabase()
      const channel = supabase
        .channel('realtime_notifications')
        .on('postgres_changes', { 
          event: 'INSERT', 
          schema: 'public', 
          table: 'notifications',
          filter: `user_id=eq.${user.id}`
        }, (payload) => {
          setNotifications(prev => [payload.new, ...prev])
        })
        .subscribe()
        
      return () => {
        supabase.removeChannel(channel)
      }
    }
  }, [user?.id, loadNotifications])

  const handleBellClick = () => {
    setShowNotifications(!showNotifications)
  }

  const handleMarkRead = async (id: string) => {
    try {
      await markNotificationRead(id)
      setNotifications(prev => prev.map(n => n.id === id ? { ...n, is_read: true } : n))
    } catch (err) {
      console.error('Failed to mark read:', err)
    }
  }

  const handleMarkAllRead = async () => {
    if (!user?.id) return
    try {
      await markAllNotificationsRead(user.id)
      setNotifications(prev => prev.map(n => ({ ...n, is_read: true })))
    } catch (err) {
      console.error('Failed to mark all read:', err)
    }
  }

  const unreadCount = notifications.filter(n => !n.is_read).length

  const handleLogout = () => {
    logout()
    router.push('/login')
  }

  const getRoleName = (role?: string) => {
    switch (role) {
      case 'ADMIN_LEVEL_1': return 'Hội Sở Chính'
      case 'ADMIN_LEVEL_2': return 'Quản lý Chi Nhánh'
      default: return 'Chuyên viên'
    }
  }

  return (
    <header className="relative z-30 h-16 bg-white border-b flex items-center justify-between px-4 md:px-6 flex-shrink-0">
      <div className="flex items-center gap-3 overflow-hidden">
        <button onClick={onMenuClick} className="md:hidden text-slate-500 hover:text-slate-700 focus:outline-none shrink-0">
          <Menu className="w-6 h-6" />
        </button>
        <button
          onClick={onDesktopSidebarToggle}
          className="hidden md:inline-flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-500 shadow-sm transition-all hover:-translate-y-0.5 hover:border-emerald-200 hover:bg-emerald-50 hover:text-emerald-700 focus:outline-none focus:ring-2 focus:ring-emerald-500/30"
          title={isDesktopSidebarOpen ? "Ẩn thanh điều hướng" : "Hiện thanh điều hướng"}
          aria-label={isDesktopSidebarOpen ? "Ẩn thanh điều hướng" : "Hiện thanh điều hướng"}
          aria-pressed={!isDesktopSidebarOpen}
        >
          {isDesktopSidebarOpen ? <PanelLeftClose className="h-4 w-4" /> : <PanelLeftOpen className="h-4 w-4" />}
        </button>
        <span className="text-lg md:text-xl font-semibold text-slate-800 truncate">{title}</span>
      </div>
      <div className="flex items-center gap-2 md:gap-4 shrink-0">
        {/* Notification Bell */}
        <div className="relative" ref={notifRef}>
          <button
            onClick={handleBellClick}
            className="relative p-2 text-slate-400 hover:text-slate-600 transition-colors"
          >
            <Bell className="w-5 h-5" />
            {unreadCount > 0 && (
              <span className="absolute top-1 right-1 w-4 h-4 bg-rose-500 rounded-full text-[10px] text-white font-bold flex items-center justify-center">
                {unreadCount > 9 ? '9+' : unreadCount}
              </span>
            )}
          </button>

          {/* Notification Dropdown */}
          {showNotifications && (
            <div className="fixed left-3 right-3 top-20 z-[80] max-h-[calc(100vh-6rem)] overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl shadow-slate-900/20 sm:left-auto sm:right-4 sm:w-80 md:absolute md:left-auto md:right-0 md:top-full md:mt-2">
              <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100">
                <h3 className="text-sm font-semibold text-slate-800">Thông báo</h3>
                {unreadCount > 0 && (
                  <button onClick={handleMarkAllRead} className="text-xs text-emerald-600 hover:text-emerald-700 font-medium flex items-center gap-1">
                    <Check className="w-3 h-3" /> Đánh dấu tất cả đã đọc
                  </button>
                )}
              </div>
              <div className="max-h-[calc(100vh-10rem)] overflow-y-auto md:max-h-80">
                {notifLoading ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="w-5 h-5 animate-spin text-slate-400" />
                  </div>
                ) : notifications.length === 0 ? (
                  <div className="py-8 text-center text-slate-400 text-sm">
                    <Bell className="w-8 h-8 mx-auto mb-2 text-slate-300" />
                    Không có thông báo
                  </div>
                ) : (
                  notifications.map((notif: any) => (
                    <button
                      key={notif.id}
                      onClick={() => {
                        if (!notif.is_read) handleMarkRead(notif.id)
                        if (notif.link_url) router.push(notif.link_url)
                      }}
                      className={`w-full text-left px-4 py-3 border-b border-slate-50 hover:bg-slate-50 transition-colors ${!notif.is_read ? 'bg-emerald-50/50' : ''}`}
                    >
                      <p className={`text-sm ${!notif.is_read ? 'font-semibold text-slate-800' : 'text-slate-600'}`}>{notif.title}</p>
                      <p className="text-xs text-slate-500 mt-0.5 line-clamp-2">{notif.message}</p>
                      <p className="text-[10px] text-slate-400 mt-1">{new Date(notif.created_at).toLocaleString('vi-VN')}</p>
                    </button>
                  ))
                )}
              </div>
            </div>
          )}
        </div>

        {/* User info */}
        <div className="flex items-center gap-2 md:gap-3 pl-2 md:pl-4 border-l border-slate-200">
          <div className="w-8 h-8 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-700 font-bold text-sm shrink-0">
            {mounted && user ? (user.name || user.email || 'U').charAt(0).toUpperCase() : 'U'}
          </div>
          <div className="hidden md:block">
            <p className="text-sm font-medium text-slate-700">{mounted && user ? (user.name || user.email) : 'Đang tải...'}</p>
            <p className="text-xs text-slate-500">{mounted ? getRoleName(user?.role) : ''}</p>
          </div>
          <button onClick={handleLogout} className="p-2 ml-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-md transition-colors" title="Đăng xuất">
            <LogOut className="w-5 h-5" />
          </button>
        </div>
      </div>
    </header>
  )
}
