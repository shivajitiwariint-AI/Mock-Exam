import { z } from 'zod'

const optionalPosInt = z.preprocess(
  (v) => (v === null || v === undefined || v === '' || (typeof v === 'number' && isNaN(v))) ? undefined : Number(v),
  z.number().int().positive().optional()
)

export const createSubjectSchema = z.object({
  name: z.string().min(1).max(100),
  description: z.string().max(500).optional(),
  color: z.string().regex(/^#[0-9A-Fa-f]{6}$/).optional(),
  icon: z.string().max(10).optional(),
})

export const updateSubjectSchema = createSubjectSchema.partial().refine(
  (data) => Object.keys(data).length > 0,
  { message: 'At least one field required' }
)

export const createTopicSchema = z.object({
  name: z.string().min(1).max(100),
  description: z.string().max(500).optional(),
  order: z.number().int().min(0).optional(),
})

export const updateTopicSchema = createTopicSchema.partial().refine(
  (data) => Object.keys(data).length > 0,
  { message: 'At least one field required' }
)

export const createSubtopicSchema = z.object({
  name: z.string().min(1).max(100),
  order: z.number().int().min(0).optional(),
})

export const updateSubtopicSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  notes: z.string().optional(),
  order: z.number().int().min(0).optional(),
})

const answerSchema = z.object({
  content: z.string().min(1),
  isCorrect: z.boolean(),
  order: z.number().int().min(0),
})

export const createQuestionSchema = z.object({
  topicId: optionalPosInt,
  subtopicId: optionalPosInt,
  type: z.enum(['MCQ', 'TRUE_FALSE', 'SHORT_ANSWER']),
  content: z.string().min(1),
  explanation: z.string().optional(),
  difficulty: z.enum(['EASY', 'MEDIUM', 'HARD']),
  answers: z.array(answerSchema).min(1),
})

export const updateQuestionSchema = createQuestionSchema

export const createExamSchema = z.object({
  title: z.string().min(1).max(150),
  subjectId: optionalPosInt,
  topicId: optionalPosInt,
  timeLimitMins: z.number().int().min(1).max(180).optional(),
  questionIds: z.array(z.number().int().positive()).min(1),
})

export const submitExamSchema = z.object({
  answers: z.record(z.string(), z.string()),
  timeTaken: z.number().int().min(0).optional(),
})

export const createStudySessionSchema = z.object({
  subjectId: optionalPosInt,
  topicId: optionalPosInt,
  durationMins: z.number().int().min(1).max(720),
  notes: z.string().max(1000).optional(),
})
