'use client'

import type { GoalData } from '@/types'
import Badge from '@/components/ui/Badge'

type Props = {
  goal: GoalData
  onEdit: (goal: GoalData) => void
  onDelete: (id: number) => void
  onComplete: (id: number) => void
}

const TYPE_COLOR: Record<string, 'blue' | 'amber' | 'green' | 'red' | 'slate'> = {
  LIFE: 'red',
  ANNUAL: 'amber',
  MONTHLY: 'green',
  WEEKLY: 'blue',
  DAILY: 'slate',
}

const STATUS_COLOR: Record<string, 'blue' | 'amber' | 'green' | 'red' | 'slate'> = {
  ACTIVE: 'blue',
  COMPLETED: 'green',
  ARCHIVED: 'slate',
}

export default function GoalCard({ goal, onEdit, onDelete, onComplete }: Props) {
  return (
    <div className={`rounded-xl border bg-white p-4 shadow-sm transition-opacity ${goal.status === 'ARCHIVED' ? 'opacity-60' : ''}`}>
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <p className={`font-semibold text-slate-800 truncate ${goal.status === 'COMPLETED' ? 'line-through text-slate-400' : ''}`}>
            {goal.title}
          </p>
          {goal.description && (
            <p className="text-xs text-slate-500 mt-0.5 line-clamp-2">{goal.description}</p>
          )}
          {goal.targetDate && (
            <p className="text-xs text-slate-400 mt-1">
              🎯 {new Date(goal.targetDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
            </p>
          )}
          <div className="flex gap-1.5 mt-2 flex-wrap">
            <Badge label={goal.type} color={TYPE_COLOR[goal.type] ?? 'slate'} />
            <Badge label={goal.status} color={STATUS_COLOR[goal.status] ?? 'slate'} />
          </div>
        </div>
        <div className="flex gap-1 flex-shrink-0">
          {goal.status === 'ACTIVE' && (
            <button
              onClick={() => onComplete(goal.id)}
              className="p-1 text-slate-400 hover:text-green-600 text-sm"
              title="Mark complete"
            >✅</button>
          )}
          <button
            onClick={() => onEdit(goal)}
            className="p-1 text-slate-400 hover:text-slate-700 text-sm"
            aria-label="Edit"
          >✏️</button>
          <button
            onClick={() => onDelete(goal.id)}
            className="p-1 text-slate-400 hover:text-red-500 text-sm"
            aria-label="Delete"
          >🗑️</button>
        </div>
      </div>
    </div>
  )
}
