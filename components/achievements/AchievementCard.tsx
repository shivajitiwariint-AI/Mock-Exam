'use client'

import Badge from '@/components/ui/Badge'
import type { AchievementData } from '@/types'

type Props = {
  achievement: AchievementData
}

const CATEGORY_COLOR: Record<AchievementData['category'], 'blue' | 'amber' | 'red' | 'green' | 'slate'> = {
  education:  'blue',
  goals:      'amber',
  health:     'red',
  meditation: 'green',
  interview:  'slate',
  growth:     'amber',
}

export default function AchievementCard({ achievement }: Props) {
  const { icon, label, description, category, earned, earnedAt } = achievement

  return (
    <div
      className={`rounded-xl border p-4 flex flex-col gap-2 transition-all ${
        earned
          ? 'bg-white border-slate-200 shadow-sm'
          : 'bg-slate-50 border-slate-200 opacity-50 grayscale'
      }`}
    >
      <div className="text-4xl">{icon}</div>
      <div className="flex items-center gap-2 flex-wrap">
        <span className="font-semibold text-slate-800 text-sm">{label}</span>
        <Badge label={category} color={CATEGORY_COLOR[category]} />
      </div>
      <p className="text-xs text-slate-500">{description}</p>
      {earned && earnedAt ? (
        <p className="text-xs text-emerald-600 font-medium">
          Earned on {new Date(earnedAt).toLocaleDateString()}
        </p>
      ) : (
        <p className="text-xs text-slate-400">🔒 Locked</p>
      )}
    </div>
  )
}
