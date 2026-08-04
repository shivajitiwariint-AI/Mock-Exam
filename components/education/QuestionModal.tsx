'use client'

import { useState, useEffect } from 'react'
import { useForm, useFieldArray } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { createQuestionSchema } from '@/lib/validations/education.schema'
import type { QuestionWithAnswers } from '@/types'
import Modal from '@/components/ui/Modal'
import Button from '@/components/ui/Button'

type FormData = z.infer<typeof createQuestionSchema>

type Props = {
  topicId: number
  subtopicId?: number
  question?: QuestionWithAnswers
  onClose: () => void
  onSave: (q: QuestionWithAnswers) => void
}

export default function QuestionModal({ topicId, subtopicId, question, onClose, onSave }: Props) {
  const isEditing = !!question
  const [submitError, setSubmitError] = useState('')

  const { register, handleSubmit, watch, setValue, control, formState: { errors, isSubmitting } } =
    useForm<FormData>({
      resolver: zodResolver(createQuestionSchema),
      defaultValues: {
        topicId,
        subtopicId,
        type: question?.type ?? 'MCQ',
        content: question?.content ?? '',
        explanation: question?.explanation ?? '',
        difficulty: question?.difficulty ?? 'MEDIUM',
        answers: question?.answers ?? [
          { content: '', isCorrect: false, order: 0 },
          { content: '', isCorrect: false, order: 1 },
        ],
      },
    })

  const { fields, append, remove } = useFieldArray({ control, name: 'answers' })
  const questionType = watch('type')

  useEffect(() => {
    if (questionType === 'TRUE_FALSE') {
      setValue('answers', [
        { content: 'True', isCorrect: false, order: 0 },
        { content: 'False', isCorrect: false, order: 1 },
      ])
    } else if (questionType === 'SHORT_ANSWER') {
      setValue('answers', [{ content: '(short answer)', isCorrect: true, order: 0 }])
    } else if (questionType === 'MCQ' && fields.length < 2) {
      setValue('answers', [
        { content: '', isCorrect: false, order: 0 },
        { content: '', isCorrect: false, order: 1 },
      ])
    }
  }, [questionType, setValue, fields.length])

  const onSubmit = async (data: FormData) => {
    setSubmitError('')
    const url = isEditing
      ? `/api/education/questions/${question!.id}`
      : '/api/education/questions'
    const method = isEditing ? 'PUT' : 'POST'

    const res = await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    })

    if (!res.ok) {
      setSubmitError('Failed to save question')
      return
    }

    const json = await res.json() as { question: QuestionWithAnswers }
    onSave(json.question)
    onClose()
  }

  return (
    <Modal isOpen onClose={onClose} title={isEditing ? 'Edit Question' : 'Add Question'}>
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 max-h-[70vh] overflow-y-auto pr-1">
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Type</label>
            <select
              {...register('type')}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="MCQ">Multiple Choice</option>
              <option value="TRUE_FALSE">True / False</option>
              <option value="SHORT_ANSWER">Short Answer</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Difficulty</label>
            <select
              {...register('difficulty')}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="EASY">Easy</option>
              <option value="MEDIUM">Medium</option>
              <option value="HARD">Hard</option>
            </select>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Question *</label>
          <textarea
            {...register('content')}
            rows={3}
            placeholder="Enter your question here…"
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
          {errors.content && <p className="text-red-500 text-xs mt-1">{errors.content.message}</p>}
        </div>

        {questionType !== 'SHORT_ANSWER' && (
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Answers {questionType === 'MCQ' && '(mark one correct)'}
            </label>
            <div className="space-y-2">
              {fields.map((field, idx) => (
                <div key={field.id} className="flex items-center gap-2">
                  <input
                    type="radio"
                    name="correctAnswer"
                    checked={watch(`answers.${idx}.isCorrect`)}
                    onChange={() => {
                      fields.forEach((_, i) => setValue(`answers.${i}.isCorrect`, i === idx))
                    }}
                    className="text-indigo-600"
                    disabled={questionType === 'TRUE_FALSE'}
                  />
                  <input
                    {...register(`answers.${idx}.content`)}
                    placeholder={`Answer ${idx + 1}`}
                    readOnly={questionType === 'TRUE_FALSE'}
                    className="flex-1 rounded-lg border border-slate-300 px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 read-only:bg-slate-50"
                  />
                  {questionType === 'MCQ' && fields.length > 2 && (
                    <button
                      type="button"
                      onClick={() => remove(idx)}
                      className="text-red-400 hover:text-red-600 text-sm"
                    >
                      ✕
                    </button>
                  )}
                </div>
              ))}
            </div>
            {questionType === 'MCQ' && fields.length < 6 && (
              <button
                type="button"
                onClick={() => append({ content: '', isCorrect: false, order: fields.length })}
                className="mt-2 text-sm text-indigo-600 hover:text-indigo-800"
              >
                + Add Answer
              </button>
            )}
          </div>
        )}

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Explanation (optional)</label>
          <textarea
            {...register('explanation')}
            rows={2}
            placeholder="Explain why the correct answer is correct…"
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>

        {submitError && <p className="text-red-500 text-sm">{submitError}</p>}

        <div className="flex gap-2 pt-1">
          <Button type="button" variant="secondary" onClick={onClose} className="flex-1">Cancel</Button>
          <Button type="submit" disabled={isSubmitting} className="flex-1">
            {isSubmitting ? 'Saving…' : isEditing ? 'Save Changes' : 'Add Question'}
          </Button>
        </div>
      </form>
    </Modal>
  )
}
