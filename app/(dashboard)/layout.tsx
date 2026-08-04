'use client'

import { useEffect } from 'react'
import { usePathname } from 'next/navigation'
import Sidebar from '@/components/layout/Sidebar'
import Header from '@/components/layout/Header'
import { useUserStore } from '@/store/useUserStore'
import Skeleton from '@/components/ui/Skeleton'

const pageTitles: Record<string, string> = {
  '/dashboard': 'Dashboard',
  '/education': 'Education',
  '/interview': 'Interview Intelligence',
  '/goals': 'Goal Management',
  '/health': 'Health Tracking',
  '/meditation': 'Meditation',
  '/analytics': 'Analytics',
  '/achievements': 'Achievements',
}

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const { user, isLoading, fetchUser } = useUserStore()

  useEffect(() => {
    fetchUser()
  }, [fetchUser])

  const title = pageTitles[pathname] ?? 'PGCIP'

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center bg-slate-50">
        <div className="space-y-3 w-48">
          <Skeleton height="1.5rem" />
          <Skeleton height="1rem" width="75%" />
          <Skeleton height="1rem" width="50%" />
        </div>
      </div>
    )
  }

  const userName = user?.profile?.name ?? user?.email ?? 'User'
  const userAvatar = user?.profile?.avatar ?? null

  return (
    <div className="flex h-screen overflow-hidden bg-slate-50">
      <Sidebar userName={userName} userAvatar={userAvatar} growthScore={0} />
      <div className="flex flex-1 flex-col overflow-hidden">
        <Header title={title} />
        <main className="flex-1 overflow-y-auto p-6">{children}</main>
      </div>
    </div>
  )
}
