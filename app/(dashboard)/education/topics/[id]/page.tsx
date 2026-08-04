'use client'

import { useState, useEffect, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import type { SubtopicData, QuestionWithAnswers } from '@/types'
import QuestionModal from '@/components/education/QuestionModal'
import Badge from '@/components/ui/Badge'
import Button from '@/components/ui/Button'
import Input from '@/components/ui/Input'
import Skeleton from '@/components/ui/Skeleton'

type TopicDetail = {
  id: number
  name: string
  description: string | null
  subjectId: number
  subject: { id: number; name: string; color: string; icon: string }
  subtopics: SubtopicData[]
  _count: { questions: number }
}

const DIFFICULTY_COLOR: Record<string, 'green' | 'amber' | 'red'> = {
  EASY: 'green',
  MEDIUM: 'amber',
  HARD: 'red',
}

const TYPE_LABEL: Record<string, string> = {
  MCQ: 'MCQ',
  TRUE_FALSE: 'T/F',
  SHORT_ANSWER: 'SA',
}

export default function TopicDetailPage() {
  const params = useParams<{ id: string }>()
  const router = useRouter()
  const topicId = parseInt(params.id, 10)

  const [topic, setTopic] = useState<TopicDetail | null>(null)
  const [questions, setQuestions] = useState<QuestionWithAnswers[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [showQuestionModal, setShowQuestionModal] = useState(false)
  const [editingQuestion, setEditingQuestion] = useState<QuestionWithAnswers | undefined>()
  const [addingSubtopic, setAddingSubtopic] = useState(false)
  const [newSubtopicName, setNewSubtopicName] = useState('')
  const [expandedNotes, setExpandedNotes] = useState<Set<number>>(new Set())
  const [notesValues, setNotesValues] = useState<Record<number, string>>({})
  const [creatingExam, setCreatingExam] = useState(false)

  const load = useCallback(async () => {
    setIsLoading(true)
    try {
      const [topicRes, qRes] = await Promise.all([
        fetch(`/api/education/topics/${topicId}`),
        fetch(`/api/education/questions?topicId=${topicId}`),
      ])
      if (!topicRes.ok) { router.push('/education'); return }
      const topicData = await topicRes.json() as { topic: TopicDetail }
      const qData = await qRes.json() as { questions: QuestionWithAnswers[] }
      setTopic(topicData.topic)
      setQuestions(qData.questions)
      const notes: Record<number, string> = {}
      topicData.topic.subtopics.forEach((s) => { notes[s.id] = s.notes ?? '' })
      setNotesValues(notes)
    } finally {
      setIsLoading(false)
    }
  }, [topicId, router])

  useEffect(() => { void load() }, [load])

  const handleAddSubtopic = async () => {
    if (!newSubtopicName.trim()) return
    const res = await fetch(`/api/education/topics/${topicId}/subtopics`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: newSubtopicName.trim() }),
    })
    if (res.ok) {
      const data = await res.json() as { subtopic: SubtopicData }
      setTopic((prev) => prev ? { ...prev, subtopics: [...prev.subtopics, data.subtopic] } : prev)
      setNotesValues((prev) => ({ ...prev, [data.subtopic.id]: '' }))
      setNewSubtopicName('')
      setAddingSubtopic(false)
    }
  }

  const handleDeleteSubtopic = async (id: number) => {
    if (!confirm('Delete this subtopic?')) return
    await fetch(`/api/education/subtopics/${id}`, { method: 'DELETE' })
    setTopic((prev) => prev ? { ...prev, subtopics: prev.subtopics.filter((s) => s.id !== id) } : prev)
  }

  const handleSaveNotes = async (subtopicId: number) => {
    await fetch(`/api/education/subtopics/${subtopicId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ notes: notesValues[subtopicId] ?? '' }),
    })
  }

  const handleQuestionSaved = (q: QuestionWithAnswers) => {
    setQuestions((prev) => {
      const exists = prev.find((p) => p.id === q.id)
      if (exists) return prev.map((p) => p.id === q.id ? q : p)
      return [q, ...prev]
    })
    setEditingQuestion(undefined)
  }

  const handleDeleteQuestion = async (id: number) => {
    if (!confirm('Delete this question?')) return
    await fetch(`/api/education/questions/${id}`, { method: 'DELETE' })
    setQuestions((prev) => prev.filter((q) => q.id !== id))
  }

  const handleCreateQuickExam = async () => {
    if (questions.length === 0) return
    setCreatingExam(true)
    const res = await fetch('/api/education/exams', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title: `${topic?.name ?? 'Topic'} Quick Exam`,
        topicId,
        questionIds: questions.map((q) => q.id),
      }),
    })
    if (res.ok) {
      const data = await res.json() as { exam: { id: number } }
      router.push(`/education/exams/${data.exam.id}`)
    }
    setCreatingExam(false)
  }

  if (isLoading) return (
    <div className="space-y-4">
      <Skeleton height="80px" />
      <Skeleton height="300px" />
    </div>
  )

  if (!topic) return null

  const toggleNotes = (id: number) => {
    setExpandedNotes((prev) => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  const grouped: Record<string, QuestionWithAnswers[]> = { EASY: [], MEDIUM: [], HARD: [] }
  questions.forEach((q) => grouped[q.difficulty]?.push(q))

  return (
    <div className="space-y-6">
      {/* Back */}
      <Link href={`/education/subjects/${topic.subject.id}`} className="text-sm text-slate-500 hover:text-slate-700">
        ← Back to {topic.subject.icon} {topic.subject.name}
      </Link>

      {/* Header */}
      <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-xl font-bold text-slate-800">{topic.name}</h1>
            {topic.description && <p className="text-sm text-slate-500 mt-1">{topic.description}</p>}
          </div>
          {questions.length > 0 && (
            <Button onClick={handleCreateQuickExam} disabled={creatingExam} size="sm">
              {creatingExam ? 'Creating…' : '📝 Quick Exam'}
            </Button>
          )}
        </div>
      </div>

      {/* Subtopics */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-base font-semibold text-slate-800">Subtopics ({topic.subtopics.length})</h2>
          <Button size="sm" variant="secondary" onClick={() => setAddingSubtopic(true)}>+ Add Subtopic</Button>
        </div>

        <div className="space-y-2">
          {topic.subtopics.map((st) => (
            <div key={st.id} className="rounded-lg border border-slate-200 bg-white overflow-hidden">
              <div
                className="flex items-center justify-between px-4 py-3 cursor-pointer hover:bg-slate-50"
                onClick={() => toggleNotes(st.id)}
              >
                <span className="font-medium text-slate-700">{st.name}</span>
                <div className="flex items-center gap-2">
                  <button
                    onClick={(e) => { e.stopPropagation(); void handleDeleteSubtopic(st.id) }}
                    className="text-slate-300 hover:text-red-500 text-sm transition-colors"
                    aria-label="Delete subtopic"
                  >
                    🗑️
                  </button>
                  <span className="text-slate-400 text-xs">{expandedNotes.has(st.id) ? '▲' : '▼'}</span>
                </div>
              </div>
              {expandedNotes.has(st.id) && (
                <div className="px-4 pb-4 border-t border-slate-100">
                  <textarea
                    value={notesValues[st.id] ?? ''}
                    onChange={(e) => setNotesValues((prev) => ({ ...prev, [st.id]: e.target.value }))}
                    onBlur={() => { void handleSaveNotes(st.id) }}
                    rows={5}
                    placeholder="Write your notes here… (auto-saves on blur)"
                    className="w-full mt-3 rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-y"
                  />
                </div>
              )}
            </div>
          ))}

          {addingSubtopic && (
            <div className="rounded-lg border border-indigo-200 bg-indigo-50 p-3 flex gap-2">
              <Input
                value={newSubtopicName}
                onChange={(e) => setNewSubtopicName(e.target.value)}
                placeholder="Subtopic name"
                autoFocus
                className="flex-1"
              />
              <Button size="sm" onClick={handleAddSubtopic}>Add</Button>
              <Button size="sm" variant="ghost" onClick={() => { setAddingSubtopic(false); setNewSubtopicName('') }}>Cancel</Button>
            </div>
          )}
        </div>
      </div>

      {/* Questions */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-base font-semibold text-slate-800">Questions ({questions.length})</h2>
          <Button size="sm" onClick={() => { setEditingQuestion(undefined); setShowQuestionModal(true) }}>
            + Add Question
          </Button>
        </div>

        {(['EASY', 'MEDIUM', 'HARD'] as const).map((diff) =>
          grouped[diff].length === 0 ? null : (
            <div key={diff} className="mb-4">
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">{diff}</p>
              <div className="space-y-2">
                {grouped[diff].map((q) => (
                  <div key={q.id} className="flex items-center justify-between rounded-lg border border-slate-200 bg-white px-4 py-3">
                    <div className="flex items-center gap-2 min-w-0">
                      <Badge label={TYPE_LABEL[q.type] ?? q.type} color={DIFFICULTY_COLOR[q.difficulty]} />
                      <p className="text-sm text-slate-700 truncate">{q.content}</p>
                    </div>
                    <div className="flex gap-1 ml-2 flex-shrink-0">
                      <button
                        onClick={() => { setEditingQuestion(q); setShowQuestionModal(true) }}
                        className="p-1 text-slate-400 hover:text-slate-700 text-sm"
                        aria-label="Edit question"
                      >
                        ✏️
                      </button>
                      <button
                        onClick={() => { void handleDeleteQuestion(q.id) }}
                        className="p-1 text-slate-400 hover:text-red-500 text-sm"
                        aria-label="Delete question"
                      >
                        🗑️
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )
        )}

        {questions.length === 0 && (
          <div className="text-center py-8 rounded-lg border border-dashed border-slate-300 text-slate-400 text-sm">
            No questions yet. Add your first question.
          </div>
        )}
      </div>

      {showQuestionModal && (
        <QuestionModal
          topicId={topicId}
          question={editingQuestion}
          onClose={() => { setShowQuestionModal(false); setEditingQuestion(undefined) }}
          onSave={handleQuestionSaved}
        />
      )}
    </div>
  )
}
