'use client'

import { useUserStore } from '@/store/useUserStore'
import StreakBanner from '@/components/dashboard/StreakBanner'
import GrowthScoreCard from '@/components/dashboard/GrowthScoreCard'
import ModuleSummaryCard from '@/components/dashboard/ModuleSummaryCard'
import Skeleton from '@/components/ui/Skeleton'
import type { ModuleSummary } from '@/types'

const modules: ModuleSummary[] = [
  { name: 'Education', icon: '📚', stat: '0%', href: '/education', color: '#3B82F6' },
  { name: 'Goals', icon: '🏆', stat: '0/0', href: '/goals', color: '#F59E0B' },
  { name: 'Health', icon: '❤️', stat: '0%', href: '/health', color: '#EF4444' },
  { name: 'Interview', icon: '🎯', stat: '0%', href: '/interview', color: '#8B5CF6' },
  { name: 'Meditation', icon: '🧘', stat: '0 days', href: '/meditation', color: '#06B6D4' },
  { name: 'Achievements', icon: '🌟', stat: '0', href: '/achievements', color: '#F59E0B' },
]

export default function DashboardPage() {
  const { user, isLoading } = useUserStore()

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton height="3rem" />
        <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
          <Skeleton height="220px" className="md:col-span-1" />
          <div className="grid grid-cols-3 gap-3 md:col-span-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} height="100px" />
            ))}
          </div>
        </div>
      </div>
    )
  }

  const userName = user?.profile?.name ?? 'there'

  return (
    <div className="space-y-6">
      <StreakBanner streak={0} userName={userName} />

      <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
        {/* Growth Score — takes 1 column */}
        <div className="md:col-span-1">
          <GrowthScoreCard score={0} />
        </div>

        {/* Module cards — 3x2 grid */}
        <div className="grid grid-cols-3 gap-3 md:col-span-3">
          {modules.map((mod) => (
            <ModuleSummaryCard key={mod.name} {...mod} />
          ))}
        </div>
      </div>

      {/* Recent Activity */}
      <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <h3 className="mb-4 text-base font-semibold text-slate-800">Recent Activity</h3>
        <div className="flex flex-col items-center justify-center py-8 text-center">
          <span className="text-4xl mb-3">🌱</span>
          <p className="text-sm text-slate-500">No activity yet.</p>
          <p className="text-xs text-slate-400 mt-1">
            Complete a study session, log a goal, or track your health to get started.
          </p>
        </div>
      </div>
    </div>
  )
}
