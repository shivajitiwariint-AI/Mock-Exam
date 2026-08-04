'use client'

import { useState, useEffect } from 'react'
import { useUserStore } from '@/store/useUserStore'
import StreakBanner from '@/components/dashboard/StreakBanner'
import GrowthScoreCard from '@/components/dashboard/GrowthScoreCard'
import ModuleSummaryCard from '@/components/dashboard/ModuleSummaryCard'
import Skeleton from '@/components/ui/Skeleton'
import type { GrowthScoreBreakdown, DailyGoalWithProgress, ModuleSummary } from '@/types'

export default function DashboardPage() {
  const { user, isLoading: userLoading } = useUserStore()
  const [score, setScore] = useState<GrowthScoreBreakdown | null>(null)
  const [goalsToday, setGoalsToday] = useState<DailyGoalWithProgress[]>([])
  const [scoreLoading, setScoreLoading] = useState(true)

  useEffect(() => {
    void (async () => {
      try {
        const [scoreRes, goalsRes] = await Promise.all([
          fetch('/api/growth-score'),
          fetch('/api/goals/today'),
        ])
        const [scoreData, goalsData] = await Promise.all([
          scoreRes.json() as Promise<{ score: GrowthScoreBreakdown }>,
          goalsRes.json() as Promise<{ goals: DailyGoalWithProgress[] }>,
        ])
        setScore(scoreData.score)
        setGoalsToday(goalsData.goals ?? [])
      } finally {
        setScoreLoading(false)
      }
    })()
  }, [])

  const completedToday = goalsToday.filter((g) => g.progress?.completed).length
  const totalToday = goalsToday.length

  const modules: ModuleSummary[] = score
    ? [
        { name: 'Education',    icon: '📚', stat: `${score.education}/100`,   href: '/education',   color: '#3B82F6' },
        { name: 'Goals',        icon: '🏆', stat: `${completedToday}/${totalToday} done`, href: '/goals', color: '#F59E0B' },
        { name: 'Health',       icon: '❤️',  stat: `${score.health}/100`,      href: '/health',      color: '#EF4444' },
        { name: 'Interview',    icon: '🎯', stat: `${score.career}/100`,       href: '/interview',   color: '#8B5CF6' },
        { name: 'Meditation',   icon: '🧘', stat: `${score.meditation}/100`,   href: '/meditation',  color: '#06B6D4' },
        { name: 'Achievements', icon: '🌟', stat: '—',                         href: '/achievements',color: '#F59E0B' },
      ]
    : [
        { name: 'Education',    icon: '📚', stat: '—', href: '/education',   color: '#3B82F6' },
        { name: 'Goals',        icon: '🏆', stat: '—', href: '/goals',       color: '#F59E0B' },
        { name: 'Health',       icon: '❤️',  stat: '—', href: '/health',      color: '#EF4444' },
        { name: 'Interview',    icon: '🎯', stat: '—', href: '/interview',   color: '#8B5CF6' },
        { name: 'Meditation',   icon: '🧘', stat: '—', href: '/meditation',  color: '#06B6D4' },
        { name: 'Achievements', icon: '🌟', stat: '—', href: '/achievements',color: '#F59E0B' },
      ]

  const isLoading = userLoading || scoreLoading
  const userName = user?.profile?.name ?? 'there'

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

  return (
    <div className="space-y-6">
      <StreakBanner streak={0} userName={userName} />

      <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
        <div className="md:col-span-1">
          <GrowthScoreCard score={score?.total ?? 0} />
        </div>
        <div className="grid grid-cols-3 gap-3 md:col-span-3">
          {modules.map((mod) => (
            <ModuleSummaryCard key={mod.name} {...mod} />
          ))}
        </div>
      </div>

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
