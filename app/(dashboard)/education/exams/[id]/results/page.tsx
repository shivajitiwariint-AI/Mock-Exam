'use client'

import { useState, useEffect, Suspense } from 'react'
import { useParams, useSearchParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import type { ExamWithQuestions, ExamResultData } from '@/types'
import Button from '@/components/ui/Button'
import Badge from '@/components/ui/Badge'
import Skeleton from '@/components/ui/Skeleton'

function ResultsContent() {
  const params = useParams<{ id: string }>()
  const searchParams = useSearchParams()
  const router = useRouter()
  const examId = parseInt(params.id, 10)
  const resultId = searchParams.get('resultId') ? parseInt(searchParams.get('resultId')!, 10) : null

  const [exam, setExam] = useState<ExamWithQuestions | null>(null)
  const [result, setResult] = useState<ExamResultData | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    Promise.all([
      fetch(`/api/education/exams/${examId}`).then((r) => r.json()),
      fetch(`/api/education/exams/${examId}/results`).then((r) => r.json()),
    ])
      .then(([examData, resultsData]: [{ exam: ExamWithQuestions }, { results: ExamResultData[] }]) => {
        setExam(examData.exam)
        const results = resultsData.results ?? []
        const target = resultId ? results.find((r) => r.id === resultId) : results[0]
        setResult(target ?? results[0] ?? null)
      })
      .finally(() => setIsLoading(false))
  }, [examId, resultId])

  if (isLoading) return <div className="space-y-4"><Skeleton height="300px" /></div>
  if (!exam || !result) return <p className="text-center text-slate-500 py-10">Result not found.</p>

  const scoreColor = result.score >= 70 ? 'text-green-600' : result.score >= 50 ? 'text-amber-600' : 'text-red-600'
  const scoreBg = result.score >= 70 ? 'bg-green-50 border-green-200' : result.score >= 50 ? 'bg-amber-50 border-amber-200' : 'bg-red-50 border-red-200'

  const formatTime = (secs: number | null) => {
    if (!secs) return null
    const m = Math.floor(secs / 60)
    const s = secs % 60
    return m > 0 ? `${m}m ${s}s` : `${s}s`
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <Link href="/education/exams" className="text-sm text-slate-500 hover:text-slate-700">
          &larr; Back to Exams
        </Link>
      </div>

      {/* Score card */}
      <div className={`rounded-xl border p-8 text-center ${scoreBg}`}>
        <h1 className="text-base font-semibold text-slate-600 mb-2">{exam.title}</h1>
        <p className={`text-7xl font-bold mb-2 ${scoreColor}`}>{result.score}%</p>
        <p className="text-slate-600 font-medium">
          {result.correctQ} / {result.totalQ} correct
        </p>
        {result.timeTaken && (
          <p className="text-sm text-slate-500 mt-1">Time: {formatTime(result.timeTaken)}</p>
        )}
      </div>

      {/* Actions */}
      <div className="flex gap-3">
        <Button variant="secondary" onClick={() => router.push(`/education/exams/${examId}`)} className="flex-1">
          Retake Exam
        </Button>
        <Button onClick={() => router.push('/education/exams')} className="flex-1">
          Back to Exams
        </Button>
      </div>

      {/* Question Review */}
      <div>
        <h2 className="text-base font-semibold text-slate-800 mb-3">Question Review</h2>
        <div className="space-y-4">
          {exam.questions.map((eq, idx) => {
            const q = eq.question
            const userAnswerId = result.answers[String(q.id)]
            const correctAnswer = q.answers.find((a) => a.isCorrect)
            const userAnswer = q.answers.find((a) => String(a.id) === userAnswerId)
            const isCorrect = q.type === 'SHORT_ANSWER' || (correctAnswer && String(correctAnswer.id) === userAnswerId)

            return (
              <div key={q.id} className={`rounded-xl border p-4 ${isCorrect ? 'border-green-200 bg-green-50' : 'border-red-200 bg-red-50'}`}>
                <div className="flex items-start gap-2 mb-3">
                  <span
                    className="flex-shrink-0 w-6 h-6 rounded-full text-xs font-bold flex items-center justify-center text-white"
                    style={{ backgroundColor: isCorrect ? '#10B981' : '#EF4444' }}
                  >
                    {idx + 1}
                  </span>
                  <p className="text-sm font-medium text-slate-800">{q.content}</p>
                </div>

                {q.type !== 'SHORT_ANSWER' && (
                  <div className="ml-8 space-y-1 text-sm">
                    {userAnswer && (
                      <p className={isCorrect ? 'text-green-700' : 'text-red-700'}>
                        Your answer: <span className="font-medium">{userAnswer.content}</span>{' '}
                        {isCorrect ? '✓' : '✗'}
                      </p>
                    )}
                    {!isCorrect && correctAnswer && (
                      <p className="text-green-700">
                        Correct answer: <span className="font-medium">{correctAnswer.content}</span>
                      </p>
                    )}
                  </div>
                )}

                {q.type === 'SHORT_ANSWER' && (
                  <div className="ml-8 text-sm">
                    <p className="text-slate-600">
                      Your answer: <span className="italic">{userAnswerId ?? '(no answer)'}</span>
                    </p>
                    <span className="mt-1 inline-block">
                      <Badge label="Manual review" color="slate" />
                    </span>
                  </div>
                )}

                {q.explanation && (
                  <div className="ml-8 mt-2 p-2 rounded bg-white/60 text-xs text-slate-600">
                    {q.explanation}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}

export default function ExamResultsPage() {
  return (
    <Suspense fallback={<div className="space-y-4"><Skeleton height="300px" /></div>}>
      <ResultsContent />
    </Suspense>
  )
}
