'use client'

import { useState, useEffect, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import type { SubjectData, TopicWithCounts, StudySessionData } from '@/types'
import TopicRow from '@/components/education/TopicRow'
import SubjectModal from '@/components/education/SubjectModal'
import StudySessionModal from '@/components/education/StudySessionModal'
import Button from '@/components/ui/Button'
import Input from '@/components/ui/Input'
import Skeleton from '@/components/ui/Skeleton'

type SubjectDetail = SubjectData & { topics: TopicWithCounts[] }

export default function SubjectDetailPage() {
  const params = useParams<{ id: string }>()
  const router = useRouter()
  const subjectId = parseInt(params.id, 10)

  const [subject, setSubject] = useState<SubjectDetail | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [showEditModal, setShowEditModal] = useState(false)
  const [showSessionModal, setShowSessionModal] = useState(false)
  const [addingTopic, setAddingTopic] = useState(false)
  const [topicName, setTopicName] = useState('')
  const [topicDesc, setTopicDesc] = useState('')
  const [savingTopic, setSavingTopic] = useState(false)

  const loadSubject = useCallback(async () => {
    setIsLoading(true)
    try {
      const res = await fetch(`/api/education/subjects/${subjectId}`)
      if (!res.ok) { router.push('/education'); return }
      const data = await res.json() as { subject: SubjectDetail }
      setSubject(data.subject)
    } finally {
      setIsLoading(false)
    }
  }, [subjectId, router])

  useEffect(() => { void loadSubject() }, [loadSubject])

  const handleAddTopic = async () => {
    if (!topicName.trim()) return
    setSavingTopic(true)
    const res = await fetch(`/api/education/subjects/${subjectId}/topics`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: topicName.trim(), description: topicDesc.trim() || undefined }),
    })
    if (res.ok) {
      const data = await res.json() as { topic: TopicWithCounts }
      setSubject((prev) => prev ? { ...prev, topics: [...prev.topics, data.topic] } : prev)
      setTopicName('')
      setTopicDesc('')
      setAddingTopic(false)
    }
    setSavingTopic(false)
  }

  const handleDeleteTopic = async (topicId: number) => {
    if (!confirm('Delete this topic and all its subtopics and questions?')) return
    await fetch(`/api/education/topics/${topicId}`, { method: 'DELETE' })
    setSubject((prev) => prev ? { ...prev, topics: prev.topics.filter((t) => t.id !== topicId) } : prev)
  }

  const handleDeleteSubject = async () => {
    if (!confirm('Delete this subject and everything inside it?')) return
    await fetch(`/api/education/subjects/${subjectId}`, { method: 'DELETE' })
    router.push('/education')
  }

  const handleSessionSaved = (_session: StudySessionData) => {
    // no-op: session saved, no state update needed here
  }

  if (isLoading) return (
    <div className="space-y-4">
      <Skeleton height="80px" />
      <Skeleton height="200px" />
    </div>
  )

  if (!subject) return null

  return (
    <div className="space-y-6">
      {/* Back */}
      <Link href="/education" className="text-sm text-slate-500 hover:text-slate-700">
        ← Back to Education
      </Link>

      {/* Subject Header */}
      <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <span className="text-4xl">{subject.icon}</span>
            <div>
              <h1 className="text-xl font-bold text-slate-800">{subject.name}</h1>
              {subject.description && (
                <p className="text-sm text-slate-500 mt-0.5">{subject.description}</p>
              )}
              <span
                className="inline-block mt-2 px-2 py-0.5 rounded-full text-xs font-medium text-white"
                style={{ backgroundColor: subject.color }}
              >
                {subject.color}
              </span>
            </div>
          </div>
          <div className="flex gap-2">
            <Button variant="secondary" size="sm" onClick={() => setShowSessionModal(true)}>
              ⏱ Log Study
            </Button>
            <Button variant="secondary" size="sm" onClick={() => setShowEditModal(true)}>
              ✏️ Edit
            </Button>
            <Button variant="danger" size="sm" onClick={handleDeleteSubject}>
              🗑️ Delete
            </Button>
          </div>
        </div>
      </div>

      {/* Topics */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-base font-semibold text-slate-800">
            Topics ({subject.topics.length})
          </h2>
          <Button size="sm" onClick={() => setAddingTopic(true)}>
            + Add Topic
          </Button>
        </div>

        <div className="space-y-2">
          {subject.topics.map((topic) => (
            <TopicRow key={topic.id} topic={topic} onDelete={handleDeleteTopic} />
          ))}

          {subject.topics.length === 0 && !addingTopic && (
            <div className="text-center py-8 rounded-lg border border-dashed border-slate-300 text-slate-400 text-sm">
              No topics yet. Add your first topic to get started.
            </div>
          )}

          {addingTopic && (
            <div className="rounded-lg border border-indigo-200 bg-indigo-50 p-4 space-y-2">
              <Input
                value={topicName}
                onChange={(e) => setTopicName(e.target.value)}
                placeholder="Topic name *"
                autoFocus
              />
              <Input
                value={topicDesc}
                onChange={(e) => setTopicDesc(e.target.value)}
                placeholder="Description (optional)"
              />
              <div className="flex gap-2">
                <Button size="sm" onClick={handleAddTopic} disabled={savingTopic || !topicName.trim()}>
                  {savingTopic ? 'Adding…' : 'Add'}
                </Button>
                <Button size="sm" variant="ghost" onClick={() => { setAddingTopic(false); setTopicName(''); setTopicDesc('') }}>
                  Cancel
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>

      {showEditModal && (
        <SubjectModal
          subject={subject}
          onClose={() => setShowEditModal(false)}
          onSave={(saved) => { setSubject((prev) => prev ? { ...prev, ...saved } : prev); setShowEditModal(false) }}
        />
      )}

      {showSessionModal && (
        <StudySessionModal
          subjectId={subjectId}
          onClose={() => setShowSessionModal(false)}
          onSave={handleSessionSaved}
        />
      )}
    </div>
  )
}
