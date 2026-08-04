import { z } from 'zod'

export const createCompanySchema = z.object({
  name: z.string().min(1).max(150),
  website: z.string().url().optional().or(z.literal('')),
  industry: z.string().max(100).optional(),
  notes: z.string().optional(),
})

export const updateCompanySchema = createCompanySchema.partial().refine(
  (data) => Object.keys(data).length > 0,
  { message: 'At least one field required' }
)

export const createJdSchema = z.object({
  role: z.string().min(1).max(150),
  jdText: z.string().min(1),
  requiredSkills: z.array(z.string().min(1)).min(1),
})

export const updateJdSchema = createJdSchema.partial().refine(
  (data) => Object.keys(data).length > 0,
  { message: 'At least one field required' }
)

export const createQuestionSchema = z.object({
  companyId: z.number().int().positive().optional(),
  jdId: z.number().int().positive().optional(),
  category: z.enum(['TECHNICAL', 'BEHAVIORAL', 'SYSTEM_DESIGN', 'CODING', 'HR']),
  question: z.string().min(1),
  answer: z.string().optional(),
  difficulty: z.enum(['EASY', 'MEDIUM', 'HARD']),
  whyAsked: z.string().optional(),
})

export const updateQuestionSchema = z.object({
  question: z.string().min(1).optional(),
  answer: z.string().optional(),
  practiced: z.boolean().optional(),
  category: z.enum(['TECHNICAL', 'BEHAVIORAL', 'SYSTEM_DESIGN', 'CODING', 'HR']).optional(),
  difficulty: z.enum(['EASY', 'MEDIUM', 'HARD']).optional(),
})

export const generateJdQuestionsSchema = z.object({
  companyId: z.number().int().positive(),
  jdId: z.number().int().positive(),
  userSkills: z.string().optional(),
})

export const createExperienceSchema = z.object({
  companyId: z.number().int().positive().optional(),
  role: z.string().min(1).max(150),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be YYYY-MM-DD'),
  status: z.enum(['APPLIED', 'SCREENING', 'INTERVIEWING', 'OFFER', 'REJECTED', 'WITHDRAWN']),
  notes: z.string().optional(),
})

export const updateExperienceSchema = createExperienceSchema.partial().refine(
  (data) => Object.keys(data).length > 0,
  { message: 'At least one field required' }
)

export const createRoundSchema = z.object({
  type: z.enum(['HR', 'TECHNICAL', 'SYSTEM_DESIGN', 'CODING', 'BEHAVIORAL', 'CASE_STUDY']),
  roundNumber: z.number().int().min(1),
  notes: z.string().optional(),
  outcome: z.string().max(50).optional(),
})
