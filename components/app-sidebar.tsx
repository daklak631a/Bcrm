'use client';

import { useState } from 'react';
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarSeparator,
} from '@/components/ui/sidebar';
import { useAuthStore } from '@/store/useAuthStore';
import { getSupabase } from '@/lib/supabase/client';
import { Building2, LayoutDashboard, Users, CalendarClock, BarChart3, Package, UserCog, LogOut, Pencil, X, Check, Loader2, ShoppingCart } from 'lucide-react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';

export function AppSidebar() {
  const { user, logout, setUser } = useAuthStore();
  const pathname = usePathname();
  const router = useRouter();
  const [isEditingName, setIsEditingName] = useState(false);
  const [newName, setNewName] = useState('');
  const [savingName, setSavingName] = useState(false);

  const handleLogout = async () => {
    const supabase = getSupabase();
    await supabase.auth.signOut();
    logout();
    router.push('/login');
  };

  const handleEditName = () => {
    setNewName(user?.full_name || user?.name || '');
    setIsEditingName(true);
  };

  const handleSaveName = async () => {
    if (!newName.trim() || !user) return;
    setSavingName(true);

    const supabase = getSupabase();
    const { error } = await supabase
      .from('profiles')
      .update({ full_name: newName.trim(), updated_at: new Date().toISOString() })
      .eq('id', user.id);

    if (!error) {
      setUser({ ...user, name: newName.trim(), full_name: newName.trim() });
    }
    setSavingName(false);
    setIsEditingName(false);
  };

  const handleCancelName = () => {
    setIsEditingName(false);
    setNewName('');
  };

  const navItems = [
    { name: 'Tổng Quan', href: '/dashboard', icon: LayoutDashboard },
    { name: 'Bảng Bán Hàng', href: '/sales', icon: ShoppingCart },
    { name: 'Khách Hàng', href: '/customers', icon: Users },
    { name: 'Tương Tác', href: '/interactions', icon: CalendarClock },
    { name: 'Danh Mục Sản Phẩm', href: '/products', icon: Package },
    { name: 'Báo Cáo', href: '/reports', icon: BarChart3 },
  ];

  // Admin-only nav
  const adminItems = user?.role === 'ADMIN_LEVEL_1'
    ? [{ name: 'Quản Lý Nhân Sự', href: '/team', icon: UserCog }]
    : [];

  return (
    <Sidebar variant="sidebar" collapsible="icon">
      <SidebarHeader className="border-b border-sidebar-border h-[60px] flex px-4">
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton size="lg" className="pointer-events-none mt-2">
              <div className="flex aspect-square size-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
                <Building2 className="size-4" />
              </div>
              <div className="flex flex-col gap-0.5 leading-none">
                <span className="font-semibold text-sidebar-foreground">Nexus Bank</span>
                <span className="text-xs text-sidebar-foreground/70">CRM Hub</span>
              </div>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>

      <SidebarContent className="pt-4">
        <SidebarMenu>
          {navItems.map((item) => {
            const isActive = pathname === item.href || (item.href !== '/dashboard' && pathname.startsWith(item.href + '/'));
            return (
              <SidebarMenuItem key={item.name} className="px-2">
                <SidebarMenuButton render={<Link href={item.href} />} isActive={isActive} tooltip={item.name}>
                  <item.icon />
                  <span>{item.name}</span>
                </SidebarMenuButton>
              </SidebarMenuItem>
            );
          })}

          {adminItems.length > 0 && (
            <>
              <SidebarSeparator className="my-2" />
              {adminItems.map((item) => {
                const isActive = pathname === item.href;
                return (
                  <SidebarMenuItem key={item.name} className="px-2">
                    <SidebarMenuButton render={<Link href={item.href} />} isActive={isActive} tooltip={item.name}>
                      <item.icon />
                      <span>{item.name}</span>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </>
          )}
        </SidebarMenu>
      </SidebarContent>

      <SidebarFooter className="border-t border-sidebar-border p-4">
        <SidebarMenu>
          <SidebarMenuItem>
            <DropdownMenu>
              <DropdownMenuTrigger render={
                <SidebarMenuButton
                  size="lg"
                  className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground"
                />
              }>
                  <Avatar className="h-8 w-8 rounded-lg">
                    <AvatarFallback className="rounded-lg">{user?.full_name?.charAt(0) || 'U'}</AvatarFallback>
                  </Avatar>
                  <div className="grid flex-1 text-left text-sm leading-tight">
                    <span className="truncate font-semibold">{user?.full_name || 'User'}</span>
                    <span className="truncate text-xs text-muted-foreground">{user?.email || user?.role || 'Role'}</span>
                  </div>
              </DropdownMenuTrigger>
              <DropdownMenuContent
                className="w-[--radix-dropdown-menu-trigger-width] min-w-56 rounded-lg"
                side="right"
                align="end"
                sideOffset={4}
              >
                <DropdownMenuLabel className="p-0 font-normal">
                  <div className="flex items-center gap-2 px-1 py-1.5 text-left text-sm">
                    <Avatar className="h-8 w-8 rounded-lg">
                      <AvatarFallback className="rounded-lg">{user?.full_name?.charAt(0) || 'U'}</AvatarFallback>
                    </Avatar>
                    <div className="grid flex-1 text-left text-sm leading-tight">
                      <span className="truncate font-semibold">{user?.full_name || 'User'}</span>
                      <span className="truncate text-xs text-muted-foreground">{user?.email || 'email@example.com'}</span>
                    </div>
                  </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleEditName}>
                  <Pencil className="mr-2 h-4 w-4" />
                  Đổi Tên Hiển Thị
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleLogout} className="text-rose-600 focus:text-rose-600">
                  <LogOut className="mr-2 h-4 w-4" />
                  Đăng Xuất
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>

      {/* Edit Name Modal */}
      {isEditingName && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm" onClick={handleCancelName}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm mx-4 p-6" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-slate-800">Đổi Tên Hiển Thị</h3>
              <button onClick={handleCancelName} className="p-1 text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>
            <input
              type="text"
              value={newName}
              onChange={e => setNewName(e.target.value)}
              placeholder="Nhập tên hiển thị mới"
              autoFocus
              className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none"
              onKeyDown={e => e.key === 'Enter' && handleSaveName()}
            />
            <div className="flex justify-end gap-3 mt-4">
              <button onClick={handleCancelName} className="px-4 py-2 text-sm font-medium text-slate-700 border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors">
                Hủy
              </button>
              <button
                onClick={handleSaveName}
                disabled={savingName || !newName.trim()}
                className="px-4 py-2 text-sm font-medium text-white bg-emerald-600 rounded-lg hover:bg-emerald-700 transition-colors disabled:opacity-70 flex items-center gap-2"
              >
                {savingName ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                Lưu
              </button>
            </div>
          </div>
        </div>
      )}
    </Sidebar>
  );
}
