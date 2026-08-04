'use client'

import { create } from 'zustand'
import type { CurrentUser } from '@/types'

type UserStore = {
  user: CurrentUser | null
  isLoading: boolean
  setUser: (user: CurrentUser) => void
  clearUser: () => void
  fetchUser: () => Promise<void>
}

export const useUserStore = create<UserStore>((set) => ({
  user: null,
  isLoading: true,

  setUser: (user) => set({ user, isLoading: false }),

  clearUser: () => set({ user: null, isLoading: false }),

  fetchUser: async () => {
    set({ isLoading: true })
    try {
      const res = await fetch('/api/auth/me')
      if (!res.ok) {
        set({ user: null, isLoading: false })
        return
      }
      const data: CurrentUser = await res.json()
      set({ user: data, isLoading: false })
    } catch {
      set({ user: null, isLoading: false })
    }
  },
}))
