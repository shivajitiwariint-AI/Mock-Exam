'use client'

import Link from 'next/link'
import type { TopicWithCounts } from '@/types'

type Props = {
  topic: TopicWithCounts
  onDelete: (id: number) => void
}

export default function TopicRow({ topic, onDelete }: Props) {
  return (
    <div className="flex items-center justify-between rounded-lg border border-slate-200 bg-white px-4 py-3 hover:bg-slate-50 transition-colors">
      <div className="flex-1 min-w-0">
        <p className="font-medium text-slate-800 truncate">{topic.name}</p>
        {topic.description && (
          <p className="text-xs text-slate-500 truncate">{topic.description}</p>
        )}
        <div className="flex gap-3 mt-1 text-xs text-slate-400">
          <span>{topic._count.subtopics} subtopics</span>
          <span>·</span>
          <span>{topic._count.questions} questions</span>
        </div>
      </div>

      <div className="flex items-center gap-2 ml-3">
        <button
          onClick={() => onDelete(topic.id)}
          className="p-1 text-slate-300 hover:text-red-500 transition-colors text-sm"
          aria-label="Delete topic"
        >
          🗑️
        </button>
        <Link
          href={`/education/topics/${topic.id}`}
          className="px-3 py-1 rounded-lg bg-indigo-50 text-indigo-700 text-xs font-medium hover:bg-indigo-100 transition-colors whitespace-nowrap"
        >
          Open →
        </Link>
      </div>
    </div>
  )
}
