'use client'

import { useState, useEffect, useCallback } from 'react'
import type { SubjectWithCounts, SubjectData } from '@/types'
import SubjectCard from '@/components/education/SubjectCard'
import SubjectModal from '@/components/education/SubjectModal'
import StudySessionModal from '@/components/education/StudySessionModal'
import Button from '@/components/ui/Button'
import Skeleton from '@/components/ui/Skeleton'

export default function EducationPage() {
  const [subjects, setSubjects] = useState<SubjectWithCounts[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [showSubjectModal, setShowSubjectModal] = useState(false)
  const [showSessionModal, setShowSessionModal] = useState(false)
  const [editingSubject, setEditingSubject] = useState<SubjectWithCounts | undefined>()
  const [weeklyMins, setWeeklyMins] = useState(0)
  const [totalQuestions, setTotalQuestions] = useState(0)

  const loadSubjects = useCallback(async () => {
    setIsLoading(true)
    try {
      const [subjRes, sessionRes, qRes] = await Promise.all([
        fetch('/api/education/subjects'),
        fetch('/api/education/study-sessions'),
        fetch('/api/education/questions'),
      ])
      const subjData = await subjRes.json() as { subjects: SubjectWithCounts[] }
      const sessionData = await sessionRes.json() as { totalMins: number; weeklyMins: number }
      const qData = await qRes.json() as { questions: unknown[] }
      setSubjects(subjData.subjects ?? [])
      setWeeklyMins(sessionData.weeklyMins ?? 0)
      setTotalQuestions(qData.questions?.length ?? 0)
    } catch {
      // ignore fetch errors
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => { void loadSubjects() }, [loadSubjects])

  const handleSubjectSaved = (saved: SubjectData) => {
    setSubjects((prev) => {
      const existing = prev.find((s) => s.id === saved.id)
      if (existing) {
        return prev.map((s) => s.id === saved.id ? { ...s, ...saved } : s)
      }
      return [{ ...saved, _count: { topics: 0, studySessions: 0, exams: 0 } }, ...prev]
    })
    setEditingSubject(undefined)
  }

  const handleDelete = async (id: number) => {
    if (!confirm('Delete this subject and all its topics, questions, and exams?')) return
    await fetch(`/api/education/subjects/${id}`, { method: 'DELETE' })
    setSubjects((prev) => prev.filter((s) => s.id !== id))
  }

  const handleEdit = (subject: SubjectWithCounts) => {
    setEditingSubject(subject)
    setShowSubjectModal(true)
  }

  const handleSessionSaved = () => {
    void loadSubjects()
  }

  const weeklyHrs = (weeklyMins / 60).toFixed(1)

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">My Education</h1>
          <p className="text-sm text-slate-500 mt-0.5">Your personal knowledge base</p>
        </div>
        <div className="flex gap-2">
          <Button variant="secondary" onClick={() => setShowSessionModal(true)}>
            ⏱ Log Study
          </Button>
          <Button onClick={() => { setEditingSubject(undefined); setShowSubjectModal(true) }}>
            + Add Subject
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: 'Subjects', value: subjects.length.toString() },
          { label: 'Questions', value: totalQuestions.toString() },
          { label: 'Study this week', value: `${weeklyHrs} hrs` },
        ].map((stat) => (
          <div key={stat.label} className="rounded-xl border border-slate-200 bg-white p-4 text-center shadow-sm">
            <p className="text-2xl font-bold text-slate-800">{stat.value}</p>
            <p className="text-xs text-slate-500 mt-0.5">{stat.label}</p>
          </div>
        ))}
      </div>

      {/* Subjects Grid */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} height="180px" />)}
        </div>
      ) : subjects.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center rounded-xl border border-dashed border-slate-300 bg-slate-50">
          <span className="text-5xl mb-4">📚</span>
          <h3 className="text-lg font-semibold text-slate-700 mb-1">No subjects yet</h3>
          <p className="text-sm text-slate-500 mb-4">Add your first subject to start building your knowledge base.</p>
          <Button onClick={() => setShowSubjectModal(true)}>+ Add Subject</Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {subjects.map((subject) => (
            <SubjectCard
              key={subject.id}
              subject={subject}
              onEdit={handleEdit}
              onDelete={handleDelete}
            />
          ))}
        </div>
      )}

      {showSubjectModal && (
        <SubjectModal
          subject={editingSubject}
          onClose={() => { setShowSubjectModal(false); setEditingSubject(undefined) }}
          onSave={handleSubjectSaved}
        />
      )}

      {showSessionModal && (
        <StudySessionModal
          onClose={() => setShowSessionModal(false)}
          onSave={handleSessionSaved}
        />
      )}
    </div>
  )
}
