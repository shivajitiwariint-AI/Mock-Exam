import { z } from 'zod'

const dateRegex = /^\d{4}-\d{2}-\d{2}$/

export const upsertHealthLogSchema = z.object({
  date: z.string().regex(dateRegex, 'Date must be YYYY-MM-DD'),
  exerciseMins: z.number().int().min(0).max(1440).optional(),
  sleepHours: z.number().min(0).max(24).optional(),
  waterGlasses: z.number().int().min(0).max(50).optional(),
  weightKg: z.number().min(0).max(500).optional(),
  notes: z.string().optional(),
})

export const updateHealthLogSchema = upsertHealthLogSchema
  .omit({ date: true })
  .partial()
  .refine((data) => Object.keys(data).length > 0, { message: 'At least one field required' })

export const createMeditationSchema = z.object({
  date: z.string().regex(dateRegex, 'Date must be YYYY-MM-DD'),
  durationMins: z.number().int().min(1).max(1440),
  reflection: z.string().optional(),
})

export const updateMeditationSchema = createMeditationSchema
  .partial()
  .refine((data) => Object.keys(data).length > 0, { message: 'At least one field required' })
