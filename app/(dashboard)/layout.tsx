'use client'

import { useEffect, useState } from 'react'
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
  '/schedule': 'Daily Schedule',
  '/analytics': 'Analytics',
  '/achievements': 'Achievements',
  '/coach': 'AI Coach',
  '/admin': 'User Management',
  '/admin/growth': 'Growth Reports',
}

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const { user, isLoading, fetchUser } = useUserStore()
  const [growthScore, setGrowthScore] = useState(0)

  useEffect(() => {
    fetchUser()
  }, [fetchUser])

  useEffect(() => {
    fetch('/api/growth-score')
      .then((r) => r.json())
      .then((d: { score?: { total?: number } }) => { if (d.score?.total !== undefined) setGrowthScore(Math.round(d.score.total)) })
      .catch(() => {})
  }, [pathname])

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
  const userIsAdmin = user?.isAdmin ?? false

  return (
    <div className="flex h-screen overflow-hidden bg-slate-50">
      <Sidebar userName={userName} userAvatar={userAvatar} growthScore={growthScore} isAdmin={userIsAdmin} />
      <div className="flex flex-1 flex-col overflow-hidden">
        <Header title={title} />
        <main className="flex-1 overflow-y-auto p-6">{children}</main>
      </div>
    </div>
  )
}
