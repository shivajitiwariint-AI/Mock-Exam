'use client'

import { useState } from 'react'
import type { GoalWithChildren, GoalData } from '@/types'
import GoalCard from '@/components/goals/GoalCard'

type Props = {
  goal: GoalWithChildren
  onEdit: (goal: GoalData) => void
  onDelete: (id: number) => void
  onComplete: (id: number) => void
}

export default function GoalTree({ goal, onEdit, onDelete, onComplete }: Props) {
  const [expanded, setExpanded] = useState(false)
  const hasChildren = goal.children.length > 0

  return (
    <div className="space-y-2">
      <GoalCard goal={goal} onEdit={onEdit} onDelete={onDelete} onComplete={onComplete} />

      {hasChildren && (
        <div className="ml-4">
          <button
            onClick={() => setExpanded((v) => !v)}
            className="text-xs text-indigo-600 hover:text-indigo-800 font-medium mb-2"
          >
            {expanded ? '▼' : '▶'} {goal.children.length} sub-goal{goal.children.length !== 1 ? 's' : ''}
          </button>
          {expanded && (
            <div className="space-y-2 pl-3 border-l-2 border-indigo-100">
              {goal.children.map((child) => (
                <GoalCard
                  key={child.id}
                  goal={child}
                  onEdit={onEdit}
                  onDelete={onDelete}
                  onComplete={onComplete}
                />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
