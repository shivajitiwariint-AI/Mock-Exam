import { z } from "zod";

export const ROLES = ["SUPER_ADMIN", "SUBJECT_ADMIN", "STUDENT"] as const;
export const USER_STATUSES = ["ACTIVE", "SUSPENDED", "DISABLED"] as const;
export const SUBJECT_STATUSES = ["ACTIVE", "INACTIVE"] as const;
export const DIFFICULTIES = ["EASY", "MEDIUM", "HARD"] as const;
export const QUESTION_STATUSES = [
  "DRAFT",
  "PENDING_REVIEW",
  "APPROVED",
  "REJECTED",
  "ARCHIVED",
] as const;
export const REVIEW_POLICIES = ["AFTER_SUBMIT", "AFTER_WINDOW_CLOSE", "NEVER"] as const;

export const idSchema = z.coerce.number().int().positive("Identifier is required");

const optionalTrimmed = (max: number) =>
  z.preprocess(
    (value) => (typeof value === "string" && value.trim() === "" ? undefined : value),
    z.string().trim().max(max).optional(),
  );

export const emailSchema = z
  .string()
  .trim()
  .toLowerCase()
  .min(3)
  .max(254)
  .email("Enter a valid email address");

export const passwordSchema = z
  .string()
  .min(10, "Password must be at least 10 characters")
  .max(128, "Password is too long")
  .regex(/[A-Za-z]/, "Password must contain a letter")
  .regex(/[0-9]/, "Password must contain a number");

export const loginSchema = z.object({
  email: emailSchema,
  password: z.string().min(1).max(128),
});

export const registerSchema = z.object({
  name: z.string().trim().min(2, "Name is too short").max(80, "Name is too long"),
  email: emailSchema,
  password: passwordSchema,
});

export const updateUserSchema = z
  .object({
    name: z.string().trim().min(2).max(80).optional(),
    role: z.enum(ROLES).optional(),
    status: z.enum(USER_STATUSES).optional(),
  })
  .refine((data) => Object.values(data).some((value) => value !== undefined), {
    message: "No updates supplied",
  });

export const createUserSchema = z.object({
  name: z.string().trim().min(2).max(80),
  email: emailSchema,
  password: passwordSchema,
  role: z.enum(ROLES).default("STUDENT"),
  subjectIds: z.array(idSchema).max(50).optional(),
});

export const listUsersQuerySchema = z.object({
  search: z.string().trim().max(120).optional(),
  role: z.enum(ROLES).optional(),
  status: z.enum(USER_STATUSES).optional(),
});

export const createSubjectSchema = z.object({
  name: z.string().trim().min(2).max(120),
  description: optionalTrimmed(2000),
  topics: z.array(z.string().trim().min(2).max(120)).max(50).optional(),
});

export const updateSubjectSchema = z
  .object({
    name: z.string().trim().min(2).max(120).optional(),
    description: optionalTrimmed(2000),
    status: z.enum(SUBJECT_STATUSES).optional(),
  })
  .refine((data) => Object.keys(data).length > 0, { message: "No updates supplied" });

export const createTopicSchema = z.object({
  name: z.string().trim().min(2).max(120),
  description: optionalTrimmed(2000),
});

export const updateTopicSchema = z
  .object({
    name: z.string().trim().min(2).max(120).optional(),
    description: optionalTrimmed(2000),
  })
  .refine((data) => Object.keys(data).length > 0, { message: "No updates supplied" });

export const optionSchema = z.object({
  key: z.string().trim().regex(/^[A-F]$/, "Option keys must be A-F"),
  text: z.string().trim().min(1).max(1000),
});

export const optionsSchema = z
  .array(optionSchema)
  .max(6, "At most six options are allowed")
  .superRefine((options, ctx) => {
    const keys = new Set<string>();
    for (const option of options) {
      if (keys.has(option.key)) {
        ctx.addIssue({
          code: "custom",
          message: `Duplicate option key: ${option.key}`,
          path: [options.indexOf(option), "key"],
        });
      }
      keys.add(option.key);
    }
  });

const questionFields = {
  type: z.enum(["MCQ", "SUBJECTIVE"]).default("MCQ"),
  questionText: z.string().trim().min(10, "Question text is too short").max(4000),
  options: optionsSchema.default([]),
  correctOption: z.string().trim().regex(/^[A-F]$/).nullable().optional(),
  explanation: optionalTrimmed(6000),
  difficulty: z.enum(DIFFICULTIES).default("MEDIUM"),
  topicId: z.preprocess(
    (value) => (value === "" || value === null ? undefined : value),
    idSchema.optional(),
  ),
};

function validateQuestion(
  data: {
    type: "MCQ" | "SUBJECTIVE";
    options: { key: string; text: string }[];
    correctOption?: string | null;
  },
  ctx: z.RefinementCtx,
) {
  if (data.type === "SUBJECTIVE") return;

  if (data.options.length < 2) {
    ctx.addIssue({
      code: "custom",
      message: "At least two options are required for an MCQ",
      path: ["options"],
    });
  }

  if (!data.correctOption) {
    ctx.addIssue({
      code: "custom",
      message: "The correct option is required for an MCQ",
      path: ["correctOption"],
    });
    return;
  }

  if (!data.options.some((option) => option.key === data.correctOption)) {
    ctx.addIssue({
      code: "custom",
      message: "The correct option must match one of the supplied options",
      path: ["correctOption"],
    });
  }
}

export const createQuestionSchema = z
  .object({
    ...questionFields,
    status: z.enum(["DRAFT", "PENDING_REVIEW"]).default("PENDING_REVIEW"),
  })
  .superRefine(validateQuestion);

export const updateQuestionSchema = z
  .object(questionFields)
  .superRefine(validateQuestion);

export const listQuestionsQuerySchema = z.object({
  status: z.enum(QUESTION_STATUSES).optional(),
  topicId: idSchema.optional(),
  search: z.string().trim().max(200).optional(),
});

export const generateQuestionsSchema = z.object({
  topicId: z.preprocess(
    (value) => (value === "" || value === null ? undefined : value),
    idSchema.optional(),
  ),
  count: z.coerce.number().int().min(1).max(5).default(3),
  difficulty: z.enum(DIFFICULTIES).default("MEDIUM"),
  instructions: optionalTrimmed(500),
});

const dateSchema = z.coerce.date().refine((date) => !Number.isNaN(date.getTime()), "Invalid date");

const examFields = {
  title: z.string().trim().min(3).max(200),
  description: optionalTrimmed(4000),
  topicId: z.preprocess(
    (value) => (value === "" || value === null ? undefined : value),
    idSchema.optional(),
  ),
  durationMinutes: z.coerce.number().int().min(1).max(600),
  passPercentage: z.coerce.number().int().min(0).max(100),
  marksPerQuestion: z.coerce.number().int().min(1).max(100),
  negativeMarks: z.coerce.number().int().min(0).max(100).default(0),
  maxAttempts: z.coerce.number().int().min(1).max(10).default(1),
  shuffleQuestions: z.boolean().default(false),
  shuffleOptions: z.boolean().default(false),
  reviewPolicy: z.enum(REVIEW_POLICIES).default("AFTER_SUBMIT"),
  availabilityStart: dateSchema,
  availabilityEnd: dateSchema,
};

const optionalExamFields = {
  title: z.string().trim().min(3).max(200).optional(),
  description: optionalTrimmed(4000),
  topicId: z.preprocess(
    (value) => (value === "" || value === null ? undefined : value),
    idSchema.optional(),
  ),
  durationMinutes: z.coerce.number().int().min(1).max(600).optional(),
  passPercentage: z.coerce.number().int().min(0).max(100).optional(),
  marksPerQuestion: z.coerce.number().int().min(1).max(100).optional(),
  negativeMarks: z.coerce.number().int().min(0).max(100).optional(),
  maxAttempts: z.coerce.number().int().min(1).max(10).optional(),
  shuffleQuestions: z.boolean().optional(),
  shuffleOptions: z.boolean().optional(),
  reviewPolicy: z.enum(REVIEW_POLICIES).optional(),
  availabilityStart: dateSchema.optional(),
  availabilityEnd: dateSchema.optional(),
};

export const createExamSchema = z
  .object({
    ...examFields,
    questionIds: z.array(idSchema).max(100).optional(),
    randomCount: z.coerce.number().int().min(1).max(100).optional(),
  })
  .superRefine((data, ctx) => {
    if (data.availabilityEnd <= data.availabilityStart) {
      ctx.addIssue({
        code: "custom",
        message: "Availability end must be after the start time",
        path: ["availabilityEnd"],
      });
    }
    if (data.negativeMarks > data.marksPerQuestion) {
      ctx.addIssue({
        code: "custom",
        message: "Negative marks cannot exceed marks per question",
        path: ["negativeMarks"],
      });
    }
    const hasQuestions = Boolean(data.questionIds?.length);
    const hasRandom = Boolean(data.randomCount);
    if (hasQuestions && hasRandom) {
      ctx.addIssue({
        code: "custom",
        message: "Choose either explicit questions or a random selection, not both",
        path: ["questionIds"],
      });
    }
    if (!hasQuestions && !hasRandom) {
      ctx.addIssue({
        code: "custom",
        message: "Select at least one question or request a random selection",
        path: ["questionIds"],
      });
    }
    if (data.questionIds && new Set(data.questionIds).size !== data.questionIds.length) {
      ctx.addIssue({
        code: "custom",
        message: "Duplicate questions are not allowed",
        path: ["questionIds"],
      });
    }
  });

export const updateExamSchema = z
  .object({
    ...optionalExamFields,
    questionIds: z.array(idSchema).max(100).optional(),
    randomCount: z.coerce.number().int().min(1).max(100).optional(),
  })
  .refine((data) => Object.keys(data).length > 0, { message: "No updates supplied" });

export const publishExamSchema = z.object({
  published: z.boolean().default(true),
});

export const saveAnswersSchema = z.object({
  answers: z
    .array(
      z.object({
        attemptQuestionId: idSchema,
        selectedOption: z.string().trim().min(1).max(8).nullable(),
      }),
    )
    .min(1)
    .max(200),
});

export const studyQuerySchema = z.object({
  subjectId: idSchema,
  question: z.string().trim().min(3, "Ask a longer question").max(500),
});

export const adminOverviewQuerySchema = z.object({
  subjectId: idSchema.optional(),
});

export const INTERVIEW_CATEGORIES = [
  "TECHNICAL",
  "BEHAVIORAL",
  "SITUATIONAL",
  "ROLE_SPECIFIC",
] as const;

export const createInterviewPrepSchema = z.object({
  title: optionalTrimmed(160),
  company: optionalTrimmed(160),
  role: optionalTrimmed(160),
  jdText: optionalTrimmed(20_000),
  interviewDate: z.preprocess(
    (value) => (typeof value === "string" && value.trim() === "" ? undefined : value),
    dateSchema.optional(),
  ),
  actualQuestionsText: optionalTrimmed(20_000),
  questionCount: z.coerce.number().int().min(1).default(8),
});

export const updateInterviewPrepSchema = z
  .object({
    interviewDate: z.preprocess(
      (value) => (value === "" || value === null ? undefined : value),
      dateSchema.nullable().optional(),
    ),
    actualQuestionsText: optionalTrimmed(20_000),
  })
  .refine((data) => Object.values(data).some((value) => value !== undefined), {
    message: "No updates supplied",
  });

export const interviewAnswerSchema = z.object({
  questionId: idSchema,
  answerText: z
    .string()
    .trim()
    .min(1, "Write an answer before submitting")
    .max(8000, "Answer is too long"),
});

export const PROCTOR_EVENT_TYPES = [
  "SCREEN_SHARE_STARTED",
  "SCREEN_SHARE_STOPPED",
  "CAMERA_STARTED",
  "CAMERA_STOPPED",
  "TAB_HIDDEN",
  "TAB_VISIBLE",
  "WINDOW_BLURRED",
  "WINDOW_FOCUSED",
  "FULLSCREEN_EXITED",
  "MIC_USED",
] as const;

export const proctorEventSchema = z.object({
  type: z.enum(PROCTOR_EVENT_TYPES),
  occurredAt: z.coerce.date().optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
});
