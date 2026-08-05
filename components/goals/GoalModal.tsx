'use client'

import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { createGoalSchema } from '@/lib/validations/goal.schema'
import type { GoalData } from '@/types'
import Modal from '@/components/ui/Modal'
import Button from '@/components/ui/Button'
import Input from '@/components/ui/Input'

type FormData = z.infer<typeof createGoalSchema>

type Props = {
  goal?: GoalData
  defaultType?: 'LIFE' | 'ANNUAL' | 'MONTHLY' | 'WEEKLY' | 'DAILY'
  defaultParentId?: number
  onClose: () => void
  onSave: (goal: GoalData) => void
}

export default function GoalModal({ goal, defaultType, defaultParentId, onClose, onSave }: Props) {
  const isEditing = !!goal

  const { register, handleSubmit, formState: { errors, isSubmitting } } =
    useForm<FormData>({
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      resolver: zodResolver(createGoalSchema) as any,
      defaultValues: {
        type: goal?.type ?? defaultType ?? 'DAILY',
        title: goal?.title ?? '',
        description: goal?.description ?? '',
        targetDate: goal?.targetDate ? goal.targetDate.split('T')[0] : '',
        parentId: goal?.parentId ?? defaultParentId,
        order: goal?.order ?? 0,
      },
    })

  const onSubmit = async (data: FormData) => {
    const url = isEditing ? `/api/goals/${goal!.id}` : '/api/goals'
    const res = await fetch(url, {
      method: isEditing ? 'PUT' : 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ...data,
        targetDate: data.targetDate || undefined,
      }),
    })
    if (!res.ok) return
    const json = await res.json() as { goal: GoalData }
    onSave(json.goal)
    onClose()
  }

  return (
    <Modal isOpen onClose={onClose} title={isEditing ? 'Edit Goal' : 'Add Goal'}>
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Level</label>
          <select
            {...register('type')}
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
          >
            {['LIFE', 'ANNUAL', 'MONTHLY', 'WEEKLY', 'DAILY'].map((t) => (
              <option key={t} value={t}>{t}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Title *</label>
          <Input {...register('title')} placeholder="What do you want to achieve?" />
          {errors.title && <p className="text-red-500 text-xs mt-1">{errors.title.message}</p>}
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Description</label>
          <textarea
            {...register('description')}
            rows={2}
            placeholder="Add details or motivation…"
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Target Date</label>
          <Input type="date" {...register('targetDate')} />
        </div>
        <div className="flex gap-2">
          <Button type="button" variant="secondary" onClick={onClose} className="flex-1">Cancel</Button>
          <Button type="submit" disabled={isSubmitting} className="flex-1">
            {isSubmitting ? 'Saving…' : isEditing ? 'Save Changes' : 'Add Goal'}
          </Button>
        </div>
      </form>
    </Modal>
  )
}
