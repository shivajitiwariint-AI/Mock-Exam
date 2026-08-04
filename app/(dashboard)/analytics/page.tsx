'use client'

import { useState, useEffect } from 'react'
import GrowthScoreCard from '@/components/dashboard/GrowthScoreCard'
import SubScoreCard from '@/components/dashboard/SubScoreCard'
import Skeleton from '@/components/ui/Skeleton'
import type { GrowthScoreBreakdown } from '@/types'

const SUB_SCORES = [
  { key: 'education' as const,          label: 'Education',           weight: '35%', color: '#3B82F6', href: '/education' },
  { key: 'career' as const,             label: 'Career',              weight: '25%', color: '#8B5CF6', href: '/interview' },
  { key: 'interviewReadiness' as const, label: 'Interview Readiness', weight: '15%', color: '#A855F7', href: '/interview' },
  { key: 'health' as const,             label: 'Health',              weight: '15%', color: '#EF4444', href: '/health' },
  { key: 'meditation' as const,         label: 'Meditation',          weight: '10%', color: '#06B6D4', href: '/meditation' },
]

export default function AnalyticsPage() {
  const [score, setScore] = useState<GrowthScoreBreakdown | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    void (async () => {
      try {
        const res = await fetch('/api/growth-score')
        const data = await res.json() as { score: GrowthScoreBreakdown }
        setScore(data.score)
      } finally {
        setIsLoading(false)
      }
    })()
  }, [])

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-800">Analytics</h1>
        <p className="text-sm text-slate-500 mt-0.5">Your unified personal growth score</p>
      </div>

      {isLoading ? (
        <div className="space-y-4">
          <Skeleton height="260px" />
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            {Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} height="120px" />)}
          </div>
        </div>
      ) : (
        <>
          {/* Growth Score Ring */}
          <div className="max-w-xs mx-auto">
            <GrowthScoreCard score={score?.total ?? 0} />
          </div>

          {/* Score formula */}
          <p className="text-center text-xs text-slate-400">
            Education 35% · Career 25% · Interview Readiness 15% · Health 15% · Meditation 10%
          </p>

          {/* Sub-score breakdown */}
          <div>
            <h2 className="font-semibold text-slate-800 mb-4">Score Breakdown</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
              {SUB_SCORES.map(({ key, label, weight, color, href }) => (
                <SubScoreCard
                  key={key}
                  label={label}
                  score={score?.[key] ?? 0}
                  weight={weight}
                  color={color}
                  href={href}
                />
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  )
}
