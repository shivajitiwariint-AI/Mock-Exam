'use client'

import { useState } from 'react'
import type { InterviewQuestionData } from '@/types'
import Badge from '@/components/ui/Badge'

type Props = {
  question: InterviewQuestionData
  onTogglePracticed: (id: number, practiced: boolean) => void
  onDelete: (id: number) => void
}

const CATEGORY_COLOR: Record<string, 'blue' | 'amber' | 'green' | 'red' | 'slate'> = {
  TECHNICAL: 'blue',
  BEHAVIORAL: 'amber',
  SYSTEM_DESIGN: 'green',
  CODING: 'red',
  HR: 'slate',
}

const DIFFICULTY_COLOR: Record<string, 'green' | 'amber' | 'red'> = {
  EASY: 'green',
  MEDIUM: 'amber',
  HARD: 'red',
}

const SOURCE_LABEL: Record<string, string> = {
  MANUAL: '✏️ Manual',
  AI_JD: '✨ AI',
  EXPERIENCE: '💼 Experience',
}

export default function QuestionItem({ question, onTogglePracticed, onDelete }: Props) {
  const [expanded, setExpanded] = useState(false)

  return (
    <div className={`rounded-lg border bg-white p-4 transition-colors ${question.practiced ? 'border-green-200 bg-green-50/30' : 'border-slate-200'}`}>
      <div className="flex items-start gap-3">
        <input
          type="checkbox"
          checked={question.practiced}
          onChange={() => onTogglePracticed(question.id, !question.practiced)}
          className="mt-1 h-4 w-4 text-green-600 rounded cursor-pointer"
          title="Mark as practiced"
        />
        <div className="flex-1 min-w-0">
          <p
            className="text-sm text-slate-800 font-medium cursor-pointer hover:text-indigo-700 leading-relaxed"
            onClick={() => setExpanded((v) => !v)}
          >
            {question.question}
          </p>

          <div className="flex flex-wrap gap-1.5 mt-2">
            <Badge label={question.category.replace('_', ' ')} color={CATEGORY_COLOR[question.category] ?? 'slate'} />
            <Badge label={question.difficulty} color={DIFFICULTY_COLOR[question.difficulty] ?? 'slate'} />
            <Badge label={SOURCE_LABEL[question.source] ?? question.source} color="slate" />
          </div>

          {question.whyAsked && expanded && (
            <p className="mt-2 text-xs text-slate-600 italic bg-slate-50 rounded p-2">
              💡 {question.whyAsked}
            </p>
          )}

          {expanded && question.answer && (
            <div className="mt-2 p-2 rounded bg-indigo-50 text-xs text-slate-700 whitespace-pre-wrap">
              <p className="font-semibold text-indigo-700 mb-1">My Answer:</p>
              {question.answer}
            </div>
          )}
        </div>

        <button
          onClick={() => onDelete(question.id)}
          className="text-slate-300 hover:text-red-500 text-sm flex-shrink-0"
          aria-label="Delete question"
        >🗑️</button>
      </div>
    </div>
  )
}
