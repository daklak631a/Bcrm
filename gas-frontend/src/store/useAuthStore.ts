import { create } from 'zustand'

export type Role = 'ADMIN_LEVEL_1' | 'ADMIN_LEVEL_2' | 'USER'

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

interface AuthState {
  user: User | null
  isAuthenticated: boolean
  isLoading: boolean
  setUser: (user: User | null) => void
  setLoading: (isLoading: boolean) => void
  logout: () => void
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  isAuthenticated: false,
  isLoading: true,
  setUser: (user) => {
    if (!user) {
      set({ user: null, isAuthenticated: false, isLoading: false })
      return
    }
    set({ user, isAuthenticated: true, isLoading: false })
  },
  setLoading: (isLoading) => set({ isLoading }),
  logout: () => set({ user: null, isAuthenticated: false, isLoading: false })
}))
