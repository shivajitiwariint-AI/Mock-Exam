'use client'

import { useState, useEffect, useCallback, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import type { InterviewQuestionData, CompanyData } from '@/types'
import QuestionItem from '@/components/interview/QuestionItem'
import Button from '@/components/ui/Button'
import Skeleton from '@/components/ui/Skeleton'
import Modal from '@/components/ui/Modal'

function QuestionsContent() {
  const searchParams = useSearchParams()
  const jdId = searchParams.get('jdId')
  const practicedFilter = searchParams.get('practiced')

  const [questions, setQuestions] = useState<InterviewQuestionData[]>([])
  const [companies, setCompanies] = useState<CompanyData[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [showAddModal, setShowAddModal] = useState(false)

  // Add question form state
  const [qText, setQText] = useState('')
  const [qCategory, setQCategory] = useState<string>('TECHNICAL')
  const [qDifficulty, setQDifficulty] = useState<string>('MEDIUM')
  const [qAnswer, setQAnswer] = useState('')
  const [qCompanyId, setQCompanyId] = useState('')
  const [saving, setSaving] = useState(false)

  const load = useCallback(async () => {
    setIsLoading(true)
    const params = new URLSearchParams()
    if (jdId) params.set('jdId', jdId)
    if (practicedFilter) params.set('practiced', practicedFilter)
    const [qRes, cRes] = await Promise.all([
      fetch(`/api/interview/questions?${params.toString()}`),
      fetch('/api/interview/companies'),
    ])
    const qData = await qRes.json() as { questions: InterviewQuestionData[] }
    const cData = await cRes.json() as { companies: CompanyData[] }
    setQuestions(qData.questions ?? [])
    setCompanies(cData.companies ?? [])
    setIsLoading(false)
  }, [jdId, practicedFilter])

  useEffect(() => { void load() }, [load])

  const handleTogglePracticed = async (id: number, practiced: boolean) => {
    await fetch(`/api/interview/questions/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ practiced }),
    })
    setQuestions((prev) => prev.map((q) => q.id === id ? { ...q, practiced } : q))
  }

  const handleDelete = async (id: number) => {
    if (!confirm('Delete this question?')) return
    await fetch(`/api/interview/questions/${id}`, { method: 'DELETE' })
    setQuestions((prev) => prev.filter((q) => q.id !== id))
  }

  const handleAddQuestion = async () => {
    if (!qText.trim()) return
    setSaving(true)
    const body: Record<string, unknown> = {
      question: qText.trim(),
      category: qCategory,
      difficulty: qDifficulty,
    }
    if (qAnswer.trim()) body.answer = qAnswer.trim()
    if (qCompanyId) body.companyId = parseInt(qCompanyId, 10)

    const res = await fetch('/api/interview/questions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })
    if (res.ok) {
      const data = await res.json() as { question: InterviewQuestionData }
      setQuestions((prev) => [data.question, ...prev])
      setQText(''); setQAnswer(''); setQCompanyId('')
      setShowAddModal(false)
    }
    setSaving(false)
  }

  const practicedCount = questions.filter((q) => q.practiced).length

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Interview Questions</h1>
          <p className="text-sm text-slate-500 mt-0.5">
            {practicedCount} / {questions.length} practiced
            {jdId ? ' (filtered by JD)' : ''}
          </p>
        </div>
        <Button onClick={() => setShowAddModal(true)}>+ Add Question</Button>
      </div>

      {isLoading ? (
        <div className="space-y-3">{Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} height="80px" />)}</div>
      ) : questions.length === 0 ? (
        <div className="text-center py-16 rounded-xl border border-dashed border-slate-300 bg-slate-50">
          <span className="text-5xl mb-4 block">❓</span>
          <h3 className="text-lg font-semibold text-slate-700 mb-1">No questions yet</h3>
          <p className="text-sm text-slate-500 mb-4">Add questions manually or generate them from a Job Description.</p>
          <Button onClick={() => setShowAddModal(true)}>+ Add Question</Button>
        </div>
      ) : (
        <div className="space-y-3">
          {questions.map((q) => (
            <QuestionItem
              key={q.id}
              question={q}
              onTogglePracticed={handleTogglePracticed}
              onDelete={handleDelete}
            />
          ))}
        </div>
      )}

      {showAddModal && (
        <Modal isOpen onClose={() => setShowAddModal(false)} title="Add Question">
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Question *</label>
              <textarea
                value={qText}
                onChange={(e) => setQText(e.target.value)}
                rows={3}
                placeholder="Enter the interview question…"
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Category</label>
                <select value={qCategory} onChange={(e) => setQCategory(e.target.value)} className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500">
                  {['TECHNICAL', 'BEHAVIORAL', 'SYSTEM_DESIGN', 'CODING', 'HR'].map((c) => (
                    <option key={c} value={c}>{c.replace('_', ' ')}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Difficulty</label>
                <select value={qDifficulty} onChange={(e) => setQDifficulty(e.target.value)} className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500">
                  {['EASY', 'MEDIUM', 'HARD'].map((d) => <option key={d} value={d}>{d}</option>)}
                </select>
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Company (optional)</label>
              <select value={qCompanyId} onChange={(e) => setQCompanyId(e.target.value)} className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500">
                <option value="">— Select company —</option>
                {companies.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">My Answer (optional)</label>
              <textarea
                value={qAnswer}
                onChange={(e) => setQAnswer(e.target.value)}
                rows={3}
                placeholder="Write your answer or notes…"
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
            <div className="flex gap-2">
              <Button variant="secondary" onClick={() => setShowAddModal(false)} className="flex-1">Cancel</Button>
              <Button onClick={handleAddQuestion} disabled={saving || !qText.trim()} className="flex-1">
                {saving ? 'Saving…' : 'Add Question'}
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  )
}

export default function QuestionsPage() {
  return (
    <Suspense fallback={<div className="space-y-4"><Skeleton height="400px" /></div>}>
      <QuestionsContent />
    </Suspense>
  )
}
