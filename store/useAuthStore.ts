import { create } from 'zustand'
import { Profile } from '@/types/models'

export type Role = 'ADMIN_LEVEL_0' | 'ADMIN_LEVEL_1' | 'ADMIN_LEVEL_2' | 'ADMIN_LEVEL_3' | 'USER' | 'ADVISOR'

export interface User {
  id: string
  name: string
  full_name?: string
  email?: string
  role: Role
  original_role?: Role
  branchId: string
  department_id?: string
  is_active?: boolean
}

function profileToUser(profile: Profile): User {
  return {
    id: profile.id,
    name: profile.full_name,
    full_name: profile.full_name,
    email: profile.email,
    role: (profile as any).effective_role || profile.role as Role,
    original_role: profile.role as Role,
    branchId: profile.department_id || 'ALL',
    department_id: profile.department_id ?? undefined,
    is_active: profile.is_active ?? true,
  }
}

interface AuthState {
  user: User | null
  isAuthenticated: boolean
  isLoading: boolean
  setUser: (user: User | Profile | null) => void
  setLoading: (isLoading: boolean) => void
  logout: () => void
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  isAuthenticated: false,
  isLoading: true,
  setUser: (userData) => {
    if (!userData) {
      set({ user: null, isAuthenticated: false, isLoading: false })
      return
    }
    // If it's a Profile from Supabase, convert it
    if ('role' in userData && typeof userData.role === 'string') {
      set({ user: profileToUser(userData as Profile), isAuthenticated: true, isLoading: false })
    } else {
      set({ user: userData as User, isAuthenticated: true, isLoading: false })
    }
  },
  setLoading: (isLoading) => set({ isLoading }),
  logout: () => set({ user: null, isAuthenticated: false, isLoading: false })
}))
