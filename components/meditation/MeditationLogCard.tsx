'use client'

import type { MeditationLogData } from '@/types'
import Badge from '@/components/ui/Badge'

type Props = {
  log: MeditationLogData
  onEdit: (log: MeditationLogData) => void
  onDelete: (id: number) => void
}

export default function MeditationLogCard({ log, onEdit, onDelete }: Props) {
  const dateLabel = new Date(log.date).toLocaleDateString('en-IN', {
    day: '2-digit', month: 'short', year: 'numeric',
  })

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-sm font-semibold text-slate-700">{dateLabel}</span>
            <Badge label={`${log.durationMins} min`} color="blue" />
          </div>
          {log.reflection && (
            <p className="text-xs text-slate-500 mt-1 line-clamp-2">
              {log.reflection.length > 100 ? log.reflection.slice(0, 100) + '…' : log.reflection}
            </p>
          )}
        </div>
        <div className="flex gap-1 flex-shrink-0">
          <button onClick={() => onEdit(log)} className="p-1 text-slate-400 hover:text-slate-700 text-sm" aria-label="Edit">✏️</button>
          <button onClick={() => onDelete(log.id)} className="p-1 text-slate-400 hover:text-red-500 text-sm" aria-label="Delete">🗑️</button>
        </div>
      </div>
    </div>
  )
}
