'use client'

import type { ExperienceWithRounds } from '@/types'
import Badge from '@/components/ui/Badge'

type Props = {
  experience: ExperienceWithRounds
  onDelete: (id: number) => void
  onAddRound: (experienceId: number) => void
}

const STATUS_COLOR: Record<string, 'green' | 'amber' | 'red' | 'blue' | 'slate'> = {
  APPLIED: 'blue',
  SCREENING: 'amber',
  INTERVIEWING: 'amber',
  OFFER: 'green',
  REJECTED: 'red',
  WITHDRAWN: 'slate',
}

const ROUND_TYPE_LABEL: Record<string, string> = {
  HR: 'HR',
  TECHNICAL: 'Technical',
  SYSTEM_DESIGN: 'System Design',
  CODING: 'Coding',
  BEHAVIORAL: 'Behavioral',
  CASE_STUDY: 'Case Study',
}

export default function ExperienceCard({ experience, onDelete, onAddRound }: Props) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-start justify-between mb-2">
        <div>
          <h3 className="font-semibold text-slate-800">{experience.role}</h3>
          <p className="text-sm text-slate-500">
            {experience.company?.name ?? 'Unknown Company'}
          </p>
          <p className="text-xs text-slate-400 mt-0.5">
            {new Date(experience.date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Badge label={experience.status} color={STATUS_COLOR[experience.status] ?? 'slate'} />
          <button
            onClick={() => onDelete(experience.id)}
            className="p-1 text-slate-300 hover:text-red-500 text-sm"
            aria-label="Delete experience"
          >🗑️</button>
        </div>
      </div>

      {experience.notes && (
        <p className="text-xs text-slate-500 mb-3 italic">{experience.notes}</p>
      )}

      {experience.rounds.length > 0 && (
        <div className="mb-3">
          <p className="text-xs font-semibold text-slate-500 mb-1.5">Rounds:</p>
          <div className="flex flex-wrap gap-1.5">
            {experience.rounds.map((r) => (
              <span
                key={r.id}
                className="text-xs bg-slate-100 text-slate-700 px-2 py-0.5 rounded-full"
              >
                R{r.roundNumber} {ROUND_TYPE_LABEL[r.type] ?? r.type}
                {r.outcome && ` — ${r.outcome}`}
              </span>
            ))}
          </div>
        </div>
      )}

      <button
        onClick={() => onAddRound(experience.id)}
        className="text-xs text-indigo-600 hover:text-indigo-800 font-medium"
      >
        + Add Round
      </button>
    </div>
  )
}
