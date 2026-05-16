import { create } from 'zustand'
import { Profile } from '@/types/models'

export type Role = 'admin_1' | 'admin_2' | 'user'

export interface User {
  id: string
  name: string
  full_name?: string
  email?: string
  role: Role
  branchId: string
  department_id?: string
  is_active?: boolean
}

function profileToUser(profile: Profile): User {
  const roleMap: Record<string, Role> = {
    'ADMIN_LEVEL_1': 'admin_1',
    'ADMIN_LEVEL_2': 'admin_2',
    'USER': 'user',
  }
  return {
    id: profile.id,
    name: profile.full_name,
    full_name: profile.full_name,
    email: profile.email,
    role: roleMap[profile.role] || 'user',
    branchId: profile.department_id || 'ALL',
    department_id: profile.department_id,
    is_active: profile.is_active ?? true,
  }
}

interface AuthState {
  user: User | null
  isAuthenticated: boolean
  isLoading: boolean
  login: (role: Role) => void
  setUser: (user: User | Profile | null) => void
  setLoading: (isLoading: boolean) => void
  logout: () => void
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  isAuthenticated: false,
  isLoading: true,
  login: (role) => set(() => {
    let user: User
    if (role === 'admin_1') {
      user = { id: 'ADMIN', name: 'Giám Đốc', full_name: 'Giám Đốc', role: 'admin_1', branchId: 'ALL' }
    } else if (role === 'admin_2') {
      user = { id: 'MANAGER_1', name: 'Trưởng Chi Nhánh 1', full_name: 'Trưởng Chi Nhánh 1', role: 'admin_2', branchId: 'B1' }
    } else {
      user = { id: 'AGENT_1', name: 'Trần Minh (Chuyên Viên)', full_name: 'Trần Minh', role: 'user', branchId: 'B1' }
    }
    return { user, isAuthenticated: true, isLoading: false }
  }),
  setUser: (userData) => {
    if (!userData) {
      set({ user: null, isAuthenticated: false, isLoading: false })
      return
    }
    // If it's a Profile from Supabase, convert it
    if ('role' in userData && typeof userData.role === 'string' && ['USER', 'ADMIN_LEVEL_1', 'ADMIN_LEVEL_2'].includes(userData.role)) {
      set({ user: profileToUser(userData as Profile), isAuthenticated: true, isLoading: false })
    } else {
      set({ user: userData as User, isAuthenticated: true, isLoading: false })
    }
  },
  setLoading: (isLoading) => set({ isLoading }),
  logout: () => set({ user: null, isAuthenticated: false, isLoading: false })
}))
