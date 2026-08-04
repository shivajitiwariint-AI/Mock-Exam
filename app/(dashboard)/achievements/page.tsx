'use client'

import { useEffect, useState } from 'react'
import AchievementCard from '@/components/achievements/AchievementCard'
import type { AchievementData } from '@/types'

type AchievementsResponse = {
  achievements: AchievementData[]
  stats: { earned: number; total: number }
}

export default function AchievementsPage() {
  const [data, setData] = useState<AchievementsResponse | null>(null)

  useEffect(() => {
    fetch('/api/achievements')
      .then((r) => r.json())
      .then((d: AchievementsResponse) => setData(d))
  }, [])

  if (!data) {
    return (
      <div className="p-6">
        <p className="text-slate-500">Loading achievements…</p>
      </div>
    )
  }

  const sorted = [...data.achievements].sort((a, b) => {
    if (a.earned && !b.earned) return -1
    if (!a.earned && b.earned) return 1
    if (a.earned && b.earned && a.earnedAt && b.earnedAt) {
      return new Date(a.earnedAt).getTime() - new Date(b.earnedAt).getTime()
    }
    return 0
  })

  const pct = Math.round((data.stats.earned / data.stats.total) * 100)

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <h1 className="text-2xl font-bold text-slate-800 mb-6">Achievements</h1>

      {/* Stats bar */}
      <div className="bg-white rounded-xl border border-slate-200 p-4 mb-6">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-medium text-slate-700">
            {data.stats.earned} / {data.stats.total} achievements earned
          </span>
          <span className="text-sm text-slate-500">{pct}%</span>
        </div>
        <div className="w-full bg-slate-100 rounded-full h-2.5">
          <div
            className="bg-amber-400 h-2.5 rounded-full transition-all"
            style={{ width: `${pct}%` }}
          />
        </div>
      </div>

      {/* Achievement grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {sorted.map((a) => (
          <AchievementCard key={a.key} achievement={a} />
        ))}
      </div>
    </div>
  )
}
