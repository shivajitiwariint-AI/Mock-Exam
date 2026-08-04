import { z } from 'zod'

export const createGoalSchema = z.object({
  type: z.enum(['LIFE', 'ANNUAL', 'MONTHLY', 'WEEKLY', 'DAILY']),
  title: z.string().min(1).max(200),
  description: z.string().optional(),
  targetDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be YYYY-MM-DD').optional(),
  parentId: z.number().int().positive().optional(),
  order: z.number().int().min(0).optional(),
})

export const updateGoalSchema = createGoalSchema
  .partial()
  .extend({ status: z.enum(['ACTIVE', 'COMPLETED', 'ARCHIVED']).optional() })
  .refine((data) => Object.keys(data).length > 0, { message: 'At least one field required' })

export const progressSchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be YYYY-MM-DD'),
  completed: z.boolean(),
  notes: z.string().optional(),
})
