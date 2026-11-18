export type Role = "SUPER_ADMIN" | "SUBJECT_ADMIN" | "STUDENT";

export type SessionUser = {
  id: string;
  name?: string | null;
  email?: string | null;
  role: Role;
};

export type Pagination = {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
};

export type Paginated<T> = {
  items: T[];
  pagination: Pagination;
};

export type SubjectOption = {
  id: string;
  name: string;
  slug: string;
  status: "ACTIVE" | "INACTIVE";
};

export type Option = { key: string; text: string };

export type Difficulty = "EASY" | "MEDIUM" | "HARD";
export type QuestionStatus = "DRAFT" | "PENDING_REVIEW" | "APPROVED" | "REJECTED" | "ARCHIVED";
export type DocumentStatus = "UPLOADED" | "PROCESSING" | "PROCESSED" | "FAILED";
export type ExamStatus = "DRAFT" | "PUBLISHED" | "UNPUBLISHED" | "ARCHIVED";
export type AttemptStatus = "IN_PROGRESS" | "SUBMITTED" | "EXPIRED";
export type UserStatus = "ACTIVE" | "SUSPENDED" | "DISABLED";
export type ReviewPolicy = "AFTER_SUBMIT" | "AFTER_WINDOW_CLOSE" | "NEVER";

export type AttemptSummary = {
  id: string;
  status: AttemptStatus;
  attemptNumber: number;
  startedAt: string;
  submittedAt: string | null;
  percentage: number | null;
  passed: boolean | null;
  score?: number | null;
  maxScore?: number | null;
  timeTakenSeconds?: number | null;
};

export type StudentDashboard = {
  summary: {
    totalAttempts: number;
    completedAttempts: number;
    inProgressAttempts: number;
    averagePercentage: number;
    bestPercentage: number | null;
  };
  subjectPerformance: {
    id: string;
    name: string;
    attempts: number;
    average: number;
    best: number | null;
  }[];
  trend: {
    percentage: number;
    date: string;
    examTitle: string;
    subject: string;
  }[];
  weakTopics: {
    topic: string;
    subject: string;
    total: number;
    correct: number;
    accuracy: number;
  }[];
  recentAttempts: {
    id: string;
    status: AttemptStatus;
    attemptNumber: number;
    startedAt: string;
    submittedAt: string | null;
    exam: { id: string; title: string; subject: { id: string; name: string } };
    percentage: number | null;
    passed: boolean | null;
    score: number | null;
    maxScore: number | null;
    timeTakenSeconds: number | null;
  }[];
};

export type StudentExam = {
  id: string;
  title: string;
  description: string | null;
  durationMinutes: number;
  passPercentage: number;
  maxAttempts: number;
  availabilityStart: string;
  availabilityEnd: string;
  questionCount: number;
  subject: { id: string; name: string };
  attempts: {
    id: string;
    status: AttemptStatus;
    attemptNumber: number;
    expiresAt: string;
    percentage: number | null;
    passed: boolean | null;
  }[];
  availability: "OPEN" | "UPCOMING" | "CLOSED";
  attemptsUsed: number;
  attemptsRemaining: number;
};

export type StudentExamDetail = Omit<StudentExam, "attempts"> & {
  marksPerQuestion: number;
  negativeMarks: number;
  reviewPolicy: ReviewPolicy;
  status: ExamStatus;
  subject: { id: string; name: string; status: "ACTIVE" | "INACTIVE" };
  attempts: {
    id: string;
    status: AttemptStatus;
    attemptNumber: number;
    startedAt: string;
    submittedAt: string | null;
    percentage: number | null;
    passed: boolean | null;
  }[];
};

export type AttemptQuestion = {
  id: string;
  order: number;
  marks: number;
  questionText: string;
  options: Option[];
  selectedOption: string | null;
  correctOption?: string;
  explanation?: string | null;
};

export type AttemptResult = {
  score: number;
  maxScore: number;
  percentage: number;
  correctCount: number;
  incorrectCount: number;
  unansweredCount: number;
  passed: boolean;
  timeTakenSeconds: number;
  computedAt: string;
};

export type AttemptView = {
  attempt: {
    id: string;
    status: AttemptStatus;
    attemptNumber: number;
    startedAt: string;
    expiresAt: string;
    submittedAt: string | null;
    serverTime: string;
  };
  exam: {
    id: string;
    title: string;
    description: string | null;
    durationMinutes: number;
    marksPerQuestion: number;
    negativeMarks: number;
    passPercentage: number;
    reviewPolicy: ReviewPolicy;
    availabilityEnd: string;
    subject: { id: string; name: string };
  };
  questions: AttemptQuestion[];
  result: AttemptResult | null;
  reviewAvailable: boolean;
};

export type StudyAnswer = {
  answer: string;
  sources: {
    documentId: string;
    filename: string;
    chunkIndex: number;
    score: number;
    snippet: string;
  }[];
};

export type AdminDashboard = {
  scope: "platform" | "subjects";
  subjects: number;
  documents: {
    total: number;
    uploaded: number;
    processing: number;
    processed: number;
    failed: number;
  };
  questions: {
    total: number;
    pendingReview: number;
    approved: number;
    draft: number;
    rejected: number;
    archived: number;
  };
  exams: {
    total: number;
    published: number;
    draft: number;
    unpublished: number;
    archived: number;
  };
  participation: { attempts: number; averagePercentage: number };
  users: { total: number; active: number; students: number; subjectAdmins: number } | null;
  pendingQuestions: {
    id: string;
    questionText: string;
    createdAt: string;
    source: "MANUAL" | "IMPORTED" | "AI";
    subject: { id: string; name: string };
  }[];
  failedDocuments: {
    id: string;
    originalFilename: string;
    errorMessage: string | null;
    updatedAt: string;
    subject: { id: string; name: string };
  }[];
  recentExams: {
    id: string;
    title: string;
    status: ExamStatus;
    availabilityStart: string;
    availabilityEnd: string;
    subject: { id: string; name: string };
    attemptCount: number;
    questionCount: number;
  }[];
};

export type AdminSubject = {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  status: "ACTIVE" | "INACTIVE";
  createdAt: string;
  topics: { id: string; name: string }[];
  admins: { id: string; name: string; email: string }[];
  documentCount: number;
  questionCount: number;
  examCount: number;
};

export type SubjectDetail = {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  status: "ACTIVE" | "INACTIVE";
  createdAt: string;
  updatedAt: string;
  topics: {
    id: string;
    name: string;
    description: string | null;
    createdAt: string;
    updatedAt: string;
    questionCount?: number;
    examCount?: number;
  }[];
  admins: { id: string; name: string; email: string; status: UserStatus }[];
  documentCount: number;
  questionCount: number;
  examCount: number;
};

export type Topic = {
  id: string;
  name: string;
  description: string | null;
  questionCount: number;
  examCount: number;
};

export type DocumentGenerationStatus = "IDLE" | "RUNNING" | "COMPLETED" | "FAILED";

export type DocumentRecord = {
  id: string;
  originalFilename: string;
  mimeType: string;
  sizeBytes: number;
  status: DocumentStatus;
  processingMessage: string | null;
  errorMessage: string | null;
  pageCount: number | null;
  chunkCount: number;
  processedAt: string | null;
  topic: { id: string; name: string } | null;
  questionGenerationStatus: DocumentGenerationStatus;
  questionGenerationProgress: number;
  questionGenerationMessage: string | null;
  generatedQuestionCount: number;
  questionGenerationCompletedAt: string | null;
  createdAt: string;
  uploader: { id: string; name: string; email: string };
};

export type QuestionBankSubject = {
  id: string;
  name: string;
  topics: { id: string; name: string }[];
};

export type QuestionBankQuestion = {
  id: string;
  type: "MCQ" | "SUBJECTIVE";
  questionText: string;
  options: Option[];
  correctOption: string | null;
  explanation: string | null;
  difficulty: Difficulty;
  topic: { id: string; name: string } | null;
  subject: { id: string; name: string };
  createdAt: string;
};

export type QuestionBankResponse = Paginated<QuestionBankQuestion> & {
  subjects: QuestionBankSubject[];
};

export type QuestionRecord = {
  id: string;
  type: "MCQ" | "SUBJECTIVE";
  questionText: string;
  options: Option[];
  correctOption: string | null;
  explanation: string | null;
  difficulty: Difficulty;
  status: QuestionStatus;
  source: "MANUAL" | "IMPORTED" | "AI";
  aiModel: string | null;
  createdAt: string;
  updatedAt: string;
  reviewedAt: string | null;
  topic: { id: string; name: string } | null;
  createdBy: { id: string; name: string; email: string };
  examUsageCount: number;
};

export type AdminExam = {
  id: string;
  title: string;
  description: string | null;
  status: ExamStatus;
  durationMinutes: number;
  passPercentage: number;
  marksPerQuestion: number;
  negativeMarks: number;
  maxAttempts: number;
  reviewPolicy: ReviewPolicy;
  availabilityStart: string;
  availabilityEnd: string;
  publishedAt: string | null;
  createdAt: string;
  topic: { id: string; name: string } | null;
  questionCount: number;
  attemptCount: number;
};

export type AdminUser = {
  id: string;
  email: string;
  name: string;
  role: Role;
  status: UserStatus;
  lastLoginAt: string | null;
  createdAt: string;
  subjects: { id: string; name: string }[];
};

export type InterviewPrepStatus = "PROCESSING" | "READY" | "FAILED";
export type InterviewSessionStatus = "IN_PROGRESS" | "COMPLETED";
export type InterviewQuestionCategory =
  | "TECHNICAL"
  | "BEHAVIORAL"
  | "SITUATIONAL"
  | "ROLE_SPECIFIC";

export type InterviewSessionSummary = {
  id: string;
  status: InterviewSessionStatus;
  startedAt: string;
  completedAt: string | null;
  overallScore: number | null;
};

export type InterviewQuestion = {
  id: string;
  order: number;
  questionText: string;
  category: InterviewQuestionCategory;
  difficulty: Difficulty;
  expectedAnswer?: string | null;
};

export type InterviewPrep = {
  id: string;
  title: string;
  company: string | null;
  role: string | null;
  resumeFilename: string | null;
  jdFilename: string | null;
  status: InterviewPrepStatus;
  errorMessage: string | null;
  aiModel: string | null;
  targetQuestionCount: number;
  interviewDate: string | null;
  actualQuestionsFilename: string | null;
  hasActualQuestions: boolean;
  createdAt: string;
  updatedAt: string;
  questionCount: number;
  sessionCount: number;
  sessions: InterviewSessionSummary[];
  questions?: InterviewQuestion[];
};

export type InterviewAnswer = {
  id: string;
  questionId: string;
  answerText: string;
  score: number | null;
  feedback: string | null;
  idealAnswer: string | null;
  improvement: string | null;
  updatedAt: string;
};

export type InterviewSessionView = {
  session: {
    id: string;
    status: InterviewSessionStatus;
    startedAt: string;
    completedAt: string | null;
    overallScore: number | null;
    summary: string | null;
    strengths: string[];
    improvementAreas: string[];
    recommendedPractice: string[];
  };
  prep: {
    id: string;
    title: string;
    company: string | null;
    role: string | null;
  };
  questions: InterviewQuestion[];
  answers: InterviewAnswer[];
};

export type AdminInterviewQuestion = {
  id: string;
  order: number;
  questionText: string;
  category: InterviewQuestionCategory;
  difficulty: Difficulty;
  expectedAnswer: string | null;
};

export type AdminInterviewKit = {
  id: string;
  title: string;
  company: string | null;
  role: string | null;
  jdFilename: string | null;
  jdPreview: string | null;
  interviewDate: string | null;
  actualQuestionsFilename: string | null;
  actualQuestionsPreview: string | null;
  status: InterviewPrepStatus;
  targetQuestionCount: number;
  proctorEventCount: number;
  proctorFlagCount: number;
  questionCount: number;
  sessionCount: number;
  createdAt: string;
  owner: { id: string; name: string; email: string };
  questions: AdminInterviewQuestion[];
};

export type AdminProctorEvent = {
  id: string;
  type: string;
  flagged: boolean;
  occurredAt: string;
  metadata: Record<string, unknown> | null;
  session: {
    id: string;
    startedAt: string;
    completedAt: string | null;
  };
};

export type AdminStudentSubjectProgress = {
  id: string;
  name: string;
  attempts: number;
  average: number;
  best: number | null;
  lastAttemptAt: string | null;
};

export type AdminStudentInterviewKit = {
  id: string;
  title: string;
  company: string | null;
  role: string | null;
  status: InterviewPrepStatus;
  questionCount: number;
  sessionCount: number;
  latestScore: number | null;
  proctorEventCount: number;
  proctorFlagCount: number;
  createdAt: string;
};

export type AdminStudentProgress = {
  id: string;
  name: string;
  email: string;
  status: UserStatus;
  createdAt: string;
  lastLoginAt: string | null;
  exams: {
    totalAttempts: number;
    completedAttempts: number;
    inProgressAttempts: number;
    averagePercentage: number;
    subjects: AdminStudentSubjectProgress[];
  };
  interviews: {
    kits: number;
    readyKits: number;
    questions: number;
    sessions: number;
    completedSessions: number;
    averageScore: number | null;
    lastActivityAt: string | null;
    recentKits: AdminStudentInterviewKit[];
  };
};
