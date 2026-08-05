'use client'

import { useState, useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { createStudySessionSchema } from '@/lib/validations/education.schema'
import type { StudySessionData, SubjectData, TopicData } from '@/types'
import Modal from '@/components/ui/Modal'
import Button from '@/components/ui/Button'
import Input from '@/components/ui/Input'

type FormData = z.infer<typeof createStudySessionSchema>

type Props = {
  subjectId?: number
  topicId?: number
  onClose: () => void
  onSave: (session: StudySessionData) => void
}

export default function StudySessionModal({ subjectId, topicId, onClose, onSave }: Props) {
  const [subjects, setSubjects] = useState<SubjectData[]>([])
  const [topics, setTopics] = useState<TopicData[]>([])

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<FormData>({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    resolver: zodResolver(createStudySessionSchema) as any,
    defaultValues: {
      subjectId,
      topicId,
      durationMins: 30,
      notes: '',
    },
  })

  const watchedSubjectId = watch('subjectId')

  useEffect(() => {
    fetch('/api/education/subjects')
      .then((r) => r.json())
      .then((data: { subjects: SubjectData[] }) => setSubjects(data.subjects))
      .catch(() => {})
  }, [])

  useEffect(() => {
    if (!watchedSubjectId) {
      setTopics([])
      return
    }
    fetch(`/api/education/subjects/${watchedSubjectId}/topics`)
      .then((r) => r.json())
      .then((data: { topics: TopicData[] }) => setTopics(data.topics))
      .catch(() => {})
  }, [watchedSubjectId])

  const onSubmit = async (data: FormData) => {
    const res = await fetch('/api/education/study-sessions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    })
    if (!res.ok) return
    const json = (await res.json()) as { session: StudySessionData }
    onSave(json.session)
    onClose()
  }

  return (
    <Modal isOpen onClose={onClose} title="Log Study Session">
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Subject</label>
          <select
            {...register('subjectId', { valueAsNumber: true })}
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
          >
            <option value="">— Select subject —</option>
            {subjects.map((s) => (
              <option key={s.id} value={s.id}>
                {s.icon} {s.name}
              </option>
            ))}
          </select>
        </div>

        {topics.length > 0 && (
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Topic</label>
            <select
              {...register('topicId', { valueAsNumber: true })}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="">— Select topic (optional) —</option>
              {topics.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name}
                </option>
              ))}
            </select>
          </div>
        )}

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">
            Duration (minutes) *
          </label>
          <Input
            type="number"
            {...register('durationMins', { valueAsNumber: true })}
            min={1}
            max={720}
          />
          {errors.durationMins && (
            <p className="text-red-500 text-xs mt-1">{errors.durationMins.message}</p>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Notes</label>
          <textarea
            {...register('notes')}
            rows={2}
            placeholder="What did you study?"
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>

        <div className="flex gap-2 pt-1">
          <Button type="button" variant="secondary" onClick={onClose} className="flex-1">
            Cancel
          </Button>
          <Button type="submit" disabled={isSubmitting} className="flex-1">
            {isSubmitting ? 'Saving…' : 'Log Session'}
          </Button>
        </div>
      </form>
    </Modal>
  )
}
