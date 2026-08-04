'use client'

import { useState } from 'react'
import type { JobDescriptionWithQuestionCount } from '@/types'
import Badge from '@/components/ui/Badge'
import Button from '@/components/ui/Button'

type Props = {
  jd: JobDescriptionWithQuestionCount
  onDelete: (id: number) => void
  onGenerateQuestions: (jdId: number) => Promise<void>
  onViewQuestions: (jdId: number) => void
}

export default function JdCard({ jd, onDelete, onGenerateQuestions, onViewQuestions }: Props) {
  const [generating, setGenerating] = useState(false)
  const skills = Array.isArray(jd.requiredSkills) ? jd.requiredSkills as string[] : []

  const handleGenerate = async () => {
    setGenerating(true)
    await onGenerateQuestions(jd.id)
    setGenerating(false)
  }

  return (
    <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex items-start justify-between mb-2">
        <div>
          <h4 className="font-semibold text-slate-800">{jd.role}</h4>
          <p className="text-xs text-slate-500 mt-0.5">
            {new Date(jd.createdAt).toLocaleDateString()} · {jd._count.questions} questions
          </p>
        </div>
        <button
          onClick={() => onDelete(jd.id)}
          className="p-1 text-slate-300 hover:text-red-500 text-sm"
          aria-label="Delete JD"
        >🗑️</button>
      </div>

      <div className="flex flex-wrap gap-1.5 mb-3">
        {skills.slice(0, 5).map((skill, i) => (
          <Badge key={i} label={skill} color="blue" />
        ))}
        {skills.length > 5 && <Badge label={`+${skills.length - 5} more`} color="slate" />}
      </div>

      <div className="flex gap-2">
        <Button
          variant="secondary"
          onClick={() => onViewQuestions(jd.id)}
          className="flex-1"
        >
          View Questions ({jd._count.questions})
        </Button>
        <Button
          onClick={handleGenerate}
          disabled={generating}
          className="flex-1"
        >
          {generating ? '⏳ Generating…' : '✨ AI Questions'}
        </Button>
      </div>
    </div>
  )
}
