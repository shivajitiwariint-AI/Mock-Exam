'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { useParams, useRouter } from 'next/navigation'
import type { ExamWithQuestions } from '@/types'
import Button from '@/components/ui/Button'
import Skeleton from '@/components/ui/Skeleton'

export default function TakeExamPage() {
  const params = useParams<{ id: string }>()
  const router = useRouter()
  const examId = parseInt(params.id, 10)

  const [exam, setExam] = useState<ExamWithQuestions | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [currentIdx, setCurrentIdx] = useState(0)
  const [answers, setAnswers] = useState<Record<string, string>>({})
  const [submitting, setSubmitting] = useState(false)
  const [timeLeft, setTimeLeft] = useState<number | null>(null)
  const startTime = useRef(Date.now())

  useEffect(() => {
    fetch(`/api/education/exams/${examId}`)
      .then((r) => r.json())
      .then((data: { exam: ExamWithQuestions }) => {
        setExam(data.exam)
        if (data.exam.timeLimitMins) {
          setTimeLeft(data.exam.timeLimitMins * 60)
        }
      })
      .finally(() => setIsLoading(false))
  }, [examId])

  const handleSubmit = useCallback(async (finalAnswers: Record<string, string>) => {
    if (!exam) return
    setSubmitting(true)
    const timeTaken = Math.round((Date.now() - startTime.current) / 1000)
    const res = await fetch(`/api/education/exams/${examId}/submit`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ answers: finalAnswers, timeTaken }),
    })
    if (res.ok) {
      const data = await res.json() as { result: { id: number } }
      router.push(`/education/exams/${examId}/results?resultId=${data.result.id}`)
    }
    setSubmitting(false)
  }, [exam, examId, router])

  // Countdown timer
  useEffect(() => {
    if (timeLeft === null) return
    if (timeLeft <= 0) {
      void handleSubmit(answers)
      return
    }
    const timer = setTimeout(() => setTimeLeft((t) => (t ?? 0) - 1), 1000)
    return () => clearTimeout(timer)
  }, [timeLeft, answers, handleSubmit])

  if (isLoading) return <div className="space-y-4"><Skeleton height="400px" /></div>
  if (!exam) return <p className="text-center text-slate-500 py-10">Exam not found.</p>

  const examQuestions = exam.questions
  const current = examQuestions[currentIdx]
  if (!current) return null

  const q = current.question
  const isLast = currentIdx === examQuestions.length - 1

  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60).toString().padStart(2, '0')
    const s = (secs % 60).toString().padStart(2, '0')
    return `${m}:${s}`
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-bold text-slate-800">{exam.title}</h1>
          <p className="text-sm text-slate-500">Question {currentIdx + 1} of {examQuestions.length}</p>
        </div>
        {timeLeft !== null && (
          <div className={`text-lg font-mono font-bold ${timeLeft < 60 ? 'text-red-600' : 'text-slate-700'}`}>
            ⏱ {formatTime(timeLeft)}
          </div>
        )}
      </div>

      {/* Progress bar */}
      <div className="w-full bg-slate-200 rounded-full h-1.5">
        <div
          className="bg-indigo-500 h-1.5 rounded-full transition-all"
          style={{ width: `${((currentIdx + 1) / examQuestions.length) * 100}%` }}
        />
      </div>

      {/* Question card */}
      <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm space-y-5">
        <p className="text-base font-medium text-slate-800 leading-relaxed">{q.content}</p>

        {q.type === 'SHORT_ANSWER' ? (
          <textarea
            value={answers[String(q.id)] ?? ''}
            onChange={(e) => setAnswers((prev) => ({ ...prev, [String(q.id)]: e.target.value }))}
            rows={4}
            placeholder="Type your answer here…"
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none"
          />
        ) : (
          <div className="space-y-2">
            {q.answers.map((answer) => {
              const selected = answers[String(q.id)] === String(answer.id)
              return (
                <label
                  key={answer.id}
                  className={`flex items-center gap-3 rounded-lg border p-3 cursor-pointer transition-colors ${
                    selected
                      ? 'border-indigo-500 bg-indigo-50'
                      : 'border-slate-200 hover:border-indigo-300 hover:bg-slate-50'
                  }`}
                >
                  <input
                    type="radio"
                    name={`q-${q.id}`}
                    value={String(answer.id)}
                    checked={selected}
                    onChange={() => setAnswers((prev) => ({ ...prev, [String(q.id)]: String(answer.id) }))}
                    className="text-indigo-600"
                  />
                  <span className="text-sm text-slate-700">{answer.content}</span>
                </label>
              )
            })}
          </div>
        )}
      </div>

      {/* Navigation */}
      <div className="flex gap-3">
        <Button
          variant="secondary"
          onClick={() => setCurrentIdx((i) => Math.max(0, i - 1))}
          disabled={currentIdx === 0}
          className="flex-1"
        >
          ← Previous
        </Button>
        {isLast ? (
          <Button
            onClick={() => { void handleSubmit(answers) }}
            disabled={submitting}
            className="flex-1"
          >
            {submitting ? 'Submitting…' : 'Submit Exam ✓'}
          </Button>
        ) : (
          <Button
            onClick={() => setCurrentIdx((i) => Math.min(examQuestions.length - 1, i + 1))}
            className="flex-1"
          >
            Next →
          </Button>
        )}
      </div>
    </div>
  )
}
