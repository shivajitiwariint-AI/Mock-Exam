'use client'

import type { DailyGoalWithProgress } from '@/types'

type Props = {
  goals: DailyGoalWithProgress[]
  onToggle: (goalId: number, completed: boolean) => void
}

export default function DailyCheckIn({ goals, onToggle }: Props) {
  const completedCount = goals.filter((g) => g.progress?.completed).length

  if (goals.length === 0) {
    return (
      <div className="text-center py-8 rounded-xl border border-dashed border-slate-300 bg-slate-50">
        <p className="text-slate-500 text-sm">No daily goals yet. Add some to track your day!</p>
      </div>
    )
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between mb-3">
        <p className="text-sm font-medium text-slate-700">
          {completedCount} / {goals.length} done today
        </p>
        <div className="flex-1 mx-4 bg-slate-200 rounded-full h-2">
          <div
            className="bg-green-500 h-2 rounded-full transition-all"
            style={{ width: `${goals.length > 0 ? (completedCount / goals.length) * 100 : 0}%` }}
          />
        </div>
      </div>

      {goals.map((goal) => {
        const done = goal.progress?.completed ?? false
        return (
          <label
            key={goal.id}
            className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
              done ? 'bg-green-50 border-green-200' : 'bg-white border-slate-200 hover:border-indigo-300'
            }`}
          >
            <input
              type="checkbox"
              checked={done}
              onChange={() => onToggle(goal.id, !done)}
              className="h-4 w-4 text-green-600 rounded cursor-pointer"
            />
            <span className={`text-sm flex-1 ${done ? 'line-through text-slate-400' : 'text-slate-800'}`}>
              {goal.title}
            </span>
            {done && <span className="text-green-500 text-xs">✓</span>}
          </label>
        )
      })}
    </div>
  )
}
