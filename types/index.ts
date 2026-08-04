export type AuthUser = {
  userId: number
  email: string
}

export type UserProfileData = {
  id: number
  name: string
  avatar: string | null
  bio: string | null
}

export type CurrentUser = {
  id: number
  email: string
  profile: UserProfileData | null
}

export type ModuleSummary = {
  name: string
  icon: string
  stat: string
  href: string
  color: string
}

export type ToastType = 'success' | 'error' | 'info'

export type ApiError = {
  error: string
  fields?: Record<string, string>
}

// ─── Education ────────────────────────────────────────────────────────────────

export type SubjectData = {
  id: number
  userId: number
  name: string
  description: string | null
  color: string
  icon: string
  createdAt: string
  updatedAt: string
}

export type SubjectWithCounts = SubjectData & {
  _count: { topics: number; studySessions: number; exams: number }
}

export type TopicData = {
  id: number
  subjectId: number
  name: string
  description: string | null
  order: number
  createdAt: string
  updatedAt: string
}

export type TopicWithCounts = TopicData & {
  _count: { subtopics: number; questions: number }
}

export type SubtopicData = {
  id: number
  topicId: number
  name: string
  notes: string | null
  order: number
  createdAt: string
  updatedAt: string
}

export type QuestionAnswerData = {
  id: number
  questionId: number
  content: string
  isCorrect: boolean
  order: number
}

export type QuestionData = {
  id: number
  userId: number
  topicId: number | null
  subtopicId: number | null
  type: 'MCQ' | 'TRUE_FALSE' | 'SHORT_ANSWER'
  content: string
  explanation: string | null
  difficulty: 'EASY' | 'MEDIUM' | 'HARD'
  createdAt: string
  updatedAt: string
}

export type QuestionWithAnswers = QuestionData & {
  answers: QuestionAnswerData[]
}

export type ExamData = {
  id: number
  userId: number
  subjectId: number | null
  topicId: number | null
  title: string
  timeLimitMins: number | null
  createdAt: string
}

export type ExamWithResultCount = ExamData & {
  _count: { questions: number; results: number }
  bestScore: number | null
}

export type ExamWithQuestions = ExamData & {
  questions: Array<{
    order: number
    question: QuestionWithAnswers
  }>
}

export type ExamResultData = {
  id: number
  examId: number
  userId: number
  score: number
  totalQ: number
  correctQ: number
  timeTaken: number | null
  answers: Record<string, string>
  createdAt: string
}

export type StudySessionData = {
  id: number
  userId: number
  subjectId: number | null
  topicId: number | null
  durationMins: number
  notes: string | null
  createdAt: string
}
