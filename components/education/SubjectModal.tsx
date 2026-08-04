'use client'

import { useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { createSubjectSchema } from '@/lib/validations/education.schema'
import type { SubjectData } from '@/types'
import Modal from '@/components/ui/Modal'
import Button from '@/components/ui/Button'
import Input from '@/components/ui/Input'

const COLOR_SWATCHES = ['#6366F1', '#F59E0B', '#10B981', '#EF4444', '#06B6D4', '#8B5CF6']

type FormData = z.infer<typeof createSubjectSchema>

type Props = {
  subject?: SubjectData
  onClose: () => void
  onSave: (subject: SubjectData) => void
}

export default function SubjectModal({ subject, onClose, onSave }: Props) {
  const isEditing = !!subject

  const { register, handleSubmit, setValue, watch, formState: { errors, isSubmitting } } =
    useForm<FormData>({
      resolver: zodResolver(createSubjectSchema),
      defaultValues: {
        name: subject?.name ?? '',
        description: subject?.description ?? '',
        color: subject?.color ?? '#6366F1',
        icon: subject?.icon ?? '📚',
      },
    })

  const selectedColor = watch('color')

  useEffect(() => {
    if (subject) {
      setValue('name', subject.name)
      setValue('description', subject.description ?? '')
      setValue('color', subject.color)
      setValue('icon', subject.icon)
    }
  }, [subject, setValue])

  const onSubmit = async (data: FormData) => {
    const url = isEditing ? `/api/education/subjects/${subject!.id}` : '/api/education/subjects'
    const method = isEditing ? 'PUT' : 'POST'

    const res = await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    })

    if (!res.ok) return

    const json = await res.json() as { subject: SubjectData }
    onSave(json.subject)
    onClose()
  }

  return (
    <Modal isOpen onClose={onClose} title={isEditing ? 'Edit Subject' : 'Add Subject'}>
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Name *</label>
          <Input {...register('name')} placeholder="e.g. React, AWS, System Design" />
          {errors.name && <p className="text-red-500 text-xs mt-1">{errors.name.message}</p>}
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Description</label>
          <textarea
            {...register('description')}
            rows={2}
            placeholder="Optional short description"
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Icon (emoji)</label>
          <Input {...register('icon')} placeholder="📚" maxLength={10} className="w-24" />
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-2">Color</label>
          <div className="flex gap-2">
            {COLOR_SWATCHES.map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => setValue('color', c)}
                className="w-7 h-7 rounded-full border-2 transition-all"
                style={{
                  backgroundColor: c,
                  borderColor: selectedColor === c ? '#1e293b' : 'transparent',
                  transform: selectedColor === c ? 'scale(1.2)' : 'scale(1)',
                }}
                aria-label={`Color ${c}`}
              />
            ))}
          </div>
        </div>

        <div className="flex gap-2 pt-2">
          <Button type="button" variant="secondary" onClick={onClose} className="flex-1">
            Cancel
          </Button>
          <Button type="submit" disabled={isSubmitting} className="flex-1">
            {isSubmitting ? 'Saving…' : isEditing ? 'Save Changes' : 'Add Subject'}
          </Button>
        </div>
      </form>
    </Modal>
  )
}
