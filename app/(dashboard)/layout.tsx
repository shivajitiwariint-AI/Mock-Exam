'use client'

import { useCallback, useEffect, useState } from 'react'
import { usePathname } from 'next/navigation'
import Sidebar from '@/components/layout/Sidebar'
import Header from '@/components/layout/Header'
import { useUserStore } from '@/store/useUserStore'
import Skeleton from '@/components/ui/Skeleton'

const pageTitles: Record<string, string> = {
  '/dashboard': 'Dashboard',
  '/education': 'Education',
  '/interview': 'Interview Intelligence',
  '/interview/questions': 'Question Bank',
  '/goals': 'Goal Management',
  '/health': 'Health Tracking',
  '/meditation': 'Meditation',
  '/schedule': 'Daily Schedule',
  '/analytics': 'Analytics',
  '/achievements': 'Achievements',
  '/coach': 'AI Coach',
  '/exam-dashboard': 'Exam Dashboard',
  '/exams': 'Exams',
  '/attempts': 'Exam Attempt',
  '/question-bank': 'Question Bank',
  '/study': 'RAG Study Assistant',
  '/history': 'Attempt History',
  '/interviews': 'Mock Interviews',
  '/admin': 'Growth Users',
  '/admin/growth': 'Growth Reports',
  '/admin/mock-exam': 'Mock Exam Admin',
  '/admin/subjects': 'Subjects',
  '/admin/users': 'Accounts',
  '/admin/interviews': 'Interview Kits',
  '/admin/progress': 'Student Progress',
}

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const { user, isLoading, fetchUser } = useUserStore()
  const [growthScore, setGrowthScore] = useState(0)
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const openSidebar = useCallback(() => setSidebarOpen(true), [])
  const closeSidebar = useCallback(() => setSidebarOpen(false), [])

  useEffect(() => {
    fetchUser()
  }, [fetchUser])

  useEffect(() => {
    fetch('/api/growth-score')
      .then((r) => r.json())
      .then((d: { score?: { total?: number } }) => { if (d.score?.total !== undefined) setGrowthScore(Math.round(d.score.total)) })
      .catch(() => {})
  }, [pathname])

  const matchedTitle = Object.entries(pageTitles)
    .sort(([left], [right]) => right.length - left.length)
    .find(([prefix]) => pathname === prefix || pathname.startsWith(`${prefix}/`))
  const title = matchedTitle?.[1] ?? 'PGCIP'

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
  const userIsAdmin = Boolean(
    user && (user.isAdmin || user.role === 'SUPER_ADMIN' || user.role === 'SUBJECT_ADMIN'),
  )

  return (
    <div className="flex h-screen overflow-hidden bg-slate-50">
      <Sidebar
        userName={userName}
        userAvatar={userAvatar}
        growthScore={growthScore}
        isAdmin={userIsAdmin}
        isOpen={sidebarOpen}
        onClose={closeSidebar}
      />
      <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
        <Header title={title} onMenuClick={openSidebar} />
        <main className="flex-1 overflow-y-auto p-3 sm:p-6">{children}</main>
      </div>
    </div>
  )
}
