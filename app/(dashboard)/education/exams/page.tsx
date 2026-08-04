'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import type { ExamWithResultCount, SubjectData, TopicData, QuestionData } from '@/types'
import Button from '@/components/ui/Button'
import Badge from '@/components/ui/Badge'
import Skeleton from '@/components/ui/Skeleton'
import Modal from '@/components/ui/Modal'
import Input from '@/components/ui/Input'

export default function ExamsPage() {
  const router = useRouter()
  const [exams, setExams] = useState<ExamWithResultCount[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [showCreate, setShowCreate] = useState(false)

  // Create exam form state
  const [subjects, setSubjects] = useState<SubjectData[]>([])
  const [topics, setTopics] = useState<TopicData[]>([])
  const [questions, setQuestions] = useState<QuestionData[]>([])
  const [selectedSubjectId, setSelectedSubjectId] = useState('')
  const [selectedTopicId, setSelectedTopicId] = useState('')
  const [selectedQIds, setSelectedQIds] = useState<Set<number>>(new Set())
  const [examTitle, setExamTitle] = useState('')
  const [timeLimitMins, setTimeLimitMins] = useState('')
  const [creating, setCreating] = useState(false)

  const load = useCallback(async () => {
    setIsLoading(true)
    const res = await fetch('/api/education/exams')
    const data = await res.json() as { exams: ExamWithResultCount[] }
    setExams(data.exams ?? [])
    setIsLoading(false)
  }, [])

  useEffect(() => { void load() }, [load])

  useEffect(() => {
    if (!showCreate) return
    fetch('/api/education/subjects')
      .then((r) => r.json())
      .then((d: { subjects: SubjectData[] }) => setSubjects(d.subjects))
      .catch(() => {})
  }, [showCreate])

  useEffect(() => {
    if (!selectedSubjectId) { setTopics([]); return }
    fetch(`/api/education/subjects/${selectedSubjectId}/topics`)
      .then((r) => r.json())
      .then((d: { topics: TopicData[] }) => setTopics(d.topics))
      .catch(() => {})
  }, [selectedSubjectId])

  useEffect(() => {
    const params = new URLSearchParams()
    if (selectedTopicId) params.set('topicId', selectedTopicId)
    else if (selectedSubjectId) params.set('subjectId', selectedSubjectId)
    fetch(`/api/education/questions?${params.toString()}`)
      .then((r) => r.json())
      .then((d: { questions: QuestionData[] }) => setQuestions(d.questions))
      .catch(() => {})
  }, [selectedTopicId, selectedSubjectId])

  const handleCreateExam = async () => {
    if (!examTitle.trim() || selectedQIds.size === 0) return
    setCreating(true)
    const body: Record<string, unknown> = {
      title: examTitle.trim(),
      questionIds: Array.from(selectedQIds),
    }
    if (selectedSubjectId) body.subjectId = parseInt(selectedSubjectId, 10)
    if (selectedTopicId) body.topicId = parseInt(selectedTopicId, 10)
    if (timeLimitMins) body.timeLimitMins = parseInt(timeLimitMins, 10)

    const res = await fetch('/api/education/exams', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })

    if (res.ok) {
      const data = await res.json() as { exam: { id: number } }
      router.push(`/education/exams/${data.exam.id}`)
    }
    setCreating(false)
  }

  const scoreColor = (score: number): 'green' | 'amber' | 'red' => {
    if (score >= 70) return 'green'
    if (score >= 50) return 'amber'
    return 'red'
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Exams</h1>
          <p className="text-sm text-slate-500 mt-0.5">Test your knowledge</p>
        </div>
        <Button onClick={() => setShowCreate(true)}>+ Create Exam</Button>
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} height="80px" />)}
        </div>
      ) : exams.length === 0 ? (
        <div className="text-center py-16 rounded-xl border border-dashed border-slate-300 bg-slate-50">
          <span className="text-5xl mb-4 block">📝</span>
          <h3 className="text-lg font-semibold text-slate-700 mb-1">No exams yet</h3>
          <p className="text-sm text-slate-500 mb-4">Create an exam to test your knowledge on any subject.</p>
          <Button onClick={() => setShowCreate(true)}>+ Create Exam</Button>
        </div>
      ) : (
        <div className="space-y-3">
          {exams.map((exam) => (
            <div key={exam.id} className="flex items-center justify-between rounded-xl border border-slate-200 bg-white px-5 py-4 shadow-sm">
              <div>
                <p className="font-semibold text-slate-800">{exam.title}</p>
                <div className="flex gap-3 text-xs text-slate-500 mt-1">
                  <span>{exam._count.questions} questions</span>
                  <span>·</span>
                  <span>{exam._count.results} attempts</span>
                  {exam.timeLimitMins && <><span>·</span><span>{exam.timeLimitMins} min limit</span></>}
                </div>
              </div>
              <div className="flex items-center gap-3">
                {exam.bestScore !== null && (
                  <Badge
                    label={`Best: ${exam.bestScore}%`}
                    color={scoreColor(exam.bestScore)}
                  />
                )}
                <Link href={`/education/exams/${exam.id}`}>
                  <Button size="sm">Start →</Button>
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}

      {showCreate && (
        <Modal isOpen onClose={() => setShowCreate(false)} title="Create Exam">
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Exam Title *</label>
              <Input value={examTitle} onChange={(e) => setExamTitle(e.target.value)} placeholder="e.g. React Hooks Mastery" />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Subject</label>
                <select
                  value={selectedSubjectId}
                  onChange={(e) => { setSelectedSubjectId(e.target.value); setSelectedTopicId(''); setSelectedQIds(new Set()) }}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="">All subjects</option>
                  {subjects.map((s) => <option key={s.id} value={s.id}>{s.icon} {s.name}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Topic</label>
                <select
                  value={selectedTopicId}
                  onChange={(e) => { setSelectedTopicId(e.target.value); setSelectedQIds(new Set()) }}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  disabled={topics.length === 0}
                >
                  <option value="">All topics</option>
                  {topics.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
                </select>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Time Limit (minutes, optional)</label>
              <Input
                type="number"
                value={timeLimitMins}
                onChange={(e) => setTimeLimitMins(e.target.value)}
                placeholder="e.g. 30"
                min={1}
                max={180}
              />
            </div>

            {questions.length > 0 && (
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-sm font-medium text-slate-700">
                    Select Questions ({selectedQIds.size} selected)
                  </label>
                  <button
                    type="button"
                    className="text-xs text-indigo-600 hover:text-indigo-800"
                    onClick={() => setSelectedQIds(selectedQIds.size === questions.length
                      ? new Set()
                      : new Set(questions.map((q) => q.id))
                    )}
                  >
                    {selectedQIds.size === questions.length ? 'Deselect all' : 'Select all'}
                  </button>
                </div>
                <div className="max-h-48 overflow-y-auto space-y-1 rounded-lg border border-slate-200 p-2">
                  {questions.map((q) => (
                    <label key={q.id} className="flex items-start gap-2 p-2 rounded hover:bg-slate-50 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={selectedQIds.has(q.id)}
                        onChange={() => {
                          setSelectedQIds((prev) => {
                            const next = new Set(prev)
                            next.has(q.id) ? next.delete(q.id) : next.add(q.id)
                            return next
                          })
                        }}
                        className="mt-0.5 text-indigo-600"
                      />
                      <span className="text-sm text-slate-700 line-clamp-2">{q.content}</span>
                    </label>
                  ))}
                </div>
              </div>
            )}

            <div className="flex gap-2">
              <Button variant="ghost" onClick={() => setShowCreate(false)} className="flex-1">Cancel</Button>
              <Button
                onClick={() => { void handleCreateExam() }}
                disabled={creating || !examTitle.trim() || selectedQIds.size === 0}
                className="flex-1"
              >
                {creating ? 'Creating…' : 'Create & Start'}
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  )
}
