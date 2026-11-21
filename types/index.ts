export type AuthUser = {
  userId: number
  email: string
  isAdmin?: boolean
  role?: 'SUPER_ADMIN' | 'SUBJECT_ADMIN' | 'STUDENT'
  status?: 'ACTIVE' | 'SUSPENDED' | 'DISABLED'
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
  name: string
  isAdmin: boolean
  role: 'SUPER_ADMIN' | 'SUBJECT_ADMIN' | 'STUDENT'
  status: 'ACTIVE' | 'SUSPENDED' | 'DISABLED'
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

// ─── Interview ─────────────────────────────────────────────────────────────────

export type CompanyData = {
  id: number
  userId: number
  name: string
  website: string | null
  industry: string | null
  notes: string | null
  createdAt: string
  updatedAt: string
}

export type CompanyWithCounts = CompanyData & {
  _count: { jobDescs: number; questions: number; experiences: number }
}

export type JobDescriptionData = {
  id: number
  companyId: number
  role: string
  jdText: string
  requiredSkills: string[]
  createdAt: string
  updatedAt: string
}

export type JobDescriptionWithQuestionCount = JobDescriptionData & {
  _count: { questions: number }
}

export type InterviewQuestionData = {
  id: number
  userId: number
  companyId: number | null
  companyName?: string | null
  jdId: number | null
  source: 'MANUAL' | 'AI_JD' | 'EXPERIENCE' | 'MOCK_EXAM' | 'AI_GUIDE'
  category: string
  question: string
  answer: string | null
  difficulty: 'EASY' | 'MEDIUM' | 'HARD'
  whyAsked: string | null
  practiced: boolean
  createdAt: string
  updatedAt: string
  subjectId?: number | null
  subjectName?: string | null
  topicId?: number | null
  topicName?: string | null
  options?: { key: string; text: string }[]
  correctOption?: string | null
  explanation?: string | null
  isReadOnly?: boolean
}

export type InterviewQuestionFacets = {
  sources: { value: string; count: number }[]
  subjects: { id: number; name: string; count: number }[]
  topics: { id: number; name: string; subjectId: number | null; subjectName: string | null; count: number }[]
  categories: { name: string; count: number }[]
  companies: { id: number; name: string; count: number }[]
}

export type InterviewQuestionsResponse = {
  questions: InterviewQuestionData[]
  subjects: MockQuestionSubject[]
  facets: InterviewQuestionFacets
  pagination: { page: number; pageSize: number; total: number; totalPages: number }
  practicedCount: number
}

export type MockQuestionSubject = {
  id: number
  name: string
  topics: { id: number; name: string }[]
}

export type InterviewCategoryData = {
  id: number
  userId: number
  name: string
  color: 'blue' | 'amber' | 'green' | 'red' | 'slate'
  createdAt: string
  updatedAt: string
}

export type ExperienceData = {
  id: number
  userId: number
  companyId: number | null
  role: string
  date: string
  status: 'APPLIED' | 'SCREENING' | 'INTERVIEWING' | 'OFFER' | 'REJECTED' | 'WITHDRAWN'
  notes: string | null
  createdAt: string
  updatedAt: string
}

export type RoundData = {
  id: number
  experienceId: number
  type: 'HR' | 'TECHNICAL' | 'SYSTEM_DESIGN' | 'CODING' | 'BEHAVIORAL' | 'CASE_STUDY'
  roundNumber: number
  notes: string | null
  outcome: string | null
  createdAt: string
}

export type ExperienceWithRounds = ExperienceData & {
  rounds: RoundData[]
  company: { id: number; name: string } | null
}

// ─── Goals ─────────────────────────────────────────────────────────────────────

export type GoalData = {
  id: number
  userId: number
  parentId: number | null
  type: 'LIFE' | 'ANNUAL' | 'MONTHLY' | 'WEEKLY' | 'DAILY'
  title: string
  description: string | null
  targetDate: string | null
  status: 'ACTIVE' | 'COMPLETED' | 'ARCHIVED'
  order: number
  createdAt: string
  updatedAt: string
}

export type GoalWithChildren = GoalData & {
  children: GoalData[]
}

export type GoalProgressData = {
  id: number
  goalId: number
  userId: number
  date: string
  completed: boolean
  notes: string | null
  createdAt: string
}

export type DailyGoalWithProgress = GoalData & {
  progress: GoalProgressData | null
}

// ─── Health ───────────────────────────────────────────────────────────────────

export type HealthLogData = {
  id: number
  userId: number
  date: string
  exerciseMins: number | null
  sleepHours: number | null
  waterGlasses: number | null
  weightKg: number | null
  notes: string | null
  createdAt: string
  updatedAt: string
}

// ─── Meditation ────────────────────────────────────────────────────────────────

export type MeditationLogData = {
  id: number
  userId: number
  date: string
  durationMins: number
  reflection: string | null
  createdAt: string
  updatedAt: string
}

// ─── Growth Score ─────────────────────────────────────────────────────────────

export type GrowthScoreBreakdown = {
  total: number
  education: number
  career: number
  interviewReadiness: number
  health: number
  meditation: number
}

// ─── Achievements ─────────────────────────────────────────────────────────────

export type AchievementData = {
  key: string
  label: string
  description: string
  category: 'education' | 'goals' | 'health' | 'meditation' | 'interview' | 'growth'
  icon: string
  earned: boolean
  earnedAt: string | null
}
