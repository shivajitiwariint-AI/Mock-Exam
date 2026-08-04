'use client'

import Link from 'next/link'
import type { SubjectWithCounts } from '@/types'

type Props = {
  subject: SubjectWithCounts
  onEdit: (subject: SubjectWithCounts) => void
  onDelete: (id: number) => void
}

export default function SubjectCard({ subject, onEdit, onDelete }: Props) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-2">
          <span className="text-2xl">{subject.icon}</span>
          <span
            className="w-3 h-3 rounded-full flex-shrink-0"
            style={{ backgroundColor: subject.color }}
          />
        </div>
        <div className="flex gap-1">
          <button
            onClick={() => onEdit(subject)}
            className="p-1 text-slate-400 hover:text-slate-700 rounded transition-colors"
            aria-label="Edit subject"
          >
            ✏️
          </button>
          <button
            onClick={() => onDelete(subject.id)}
            className="p-1 text-slate-400 hover:text-red-500 rounded transition-colors"
            aria-label="Delete subject"
          >
            🗑️
          </button>
        </div>
      </div>

      <h3 className="font-semibold text-slate-800 mb-1 truncate">{subject.name}</h3>
      {subject.description && (
        <p className="text-sm text-slate-500 mb-3 line-clamp-2">{subject.description}</p>
      )}

      <div className="flex items-center gap-3 text-xs text-slate-500 mb-4">
        <span>{subject._count.topics} topics</span>
        <span>·</span>
        <span>{subject._count.studySessions} sessions</span>
        <span>·</span>
        <span>{subject._count.exams} exams</span>
      </div>

      <Link
        href={`/education/subjects/${subject.id}`}
        className="block w-full text-center py-2 rounded-lg bg-indigo-50 text-indigo-700 text-sm font-medium hover:bg-indigo-100 transition-colors"
      >
        View Subject →
      </Link>
    </div>
  )
}
