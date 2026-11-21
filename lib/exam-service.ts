import type { AttemptStatus, Difficulty, Exam, AttemptResult, Prisma } from "@/app/generated/prisma/client";
import { prisma } from "./db";
import { ApiError } from "./errors";
import { scoreAttempt } from "./scoring";

export type QuestionOption = { key: string; text: string };

export type QuestionSnapshot = {
  questionText: string;
  options: QuestionOption[];
  correctOption: string;
  explanation: string | null;
  difficulty: Difficulty;
  topicId: number | null;
  topicName: string | null;
  sourceDocumentId: number | null;
};

const attemptInclude = {
  exam: {
    include: {
      subject: { select: { id: true, name: true, status: true } },
    },
  },
  questions: {
    orderBy: { order: "asc" as const },
    include: { answers: { select: { selectedOption: true } } },
  },
  result: true,
} satisfies Prisma.ExamAttemptInclude;

type LoadedAttempt = Prisma.ExamAttemptGetPayload<{ include: typeof attemptInclude }>;

function parseOptions(value: Prisma.JsonValue): QuestionOption[] {
  if (!Array.isArray(value)) {
    throw new ApiError(500, "INVALID_QUESTION", "Question options are invalid.");
  }
  const options: QuestionOption[] = [];
  for (const entry of value) {
    if (
      !entry ||
      typeof entry !== "object" ||
      Array.isArray(entry) ||
      typeof (entry as { key?: unknown }).key !== "string" ||
      typeof (entry as { text?: unknown }).text !== "string"
    ) {
      throw new ApiError(500, "INVALID_QUESTION", "Question options are invalid.");
    }
    options.push({
      key: (entry as { key: string }).key,
      text: (entry as { text: string }).text,
    });
  }
  return options;
}

function parseSnapshot(value: Prisma.JsonValue): QuestionSnapshot {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new ApiError(500, "INVALID_SNAPSHOT", "Attempt question snapshot is invalid.");
  }
  const snapshot = value as unknown as QuestionSnapshot;
  return {
    ...snapshot,
    options: parseOptions(snapshot.options as unknown as Prisma.JsonValue),
  };
}

export function buildSnapshot(
  question: {
    questionText: string;
    options: Prisma.JsonValue;
    correctOption: string;
    explanation: string | null;
    difficulty: Difficulty;
    topicId: number | null;
    topic?: { id: number; name: string } | null;
  },
): QuestionSnapshot {
  return {
    questionText: question.questionText,
    options: parseOptions(question.options),
    correctOption: question.correctOption ?? "A",
    explanation: question.explanation,
    difficulty: question.difficulty,
    topicId: question.topicId,
    topicName: question.topic?.name ?? null,
    sourceDocumentId: null,
  };
}

function shuffle<T>(items: T[]): T[] {
  const copy = [...items];
  for (let index = copy.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(Math.random() * (index + 1));
    [copy[index], copy[swapIndex]] = [copy[swapIndex], copy[index]];
  }
  return copy;
}

function reviewAvailable(
  exam: Pick<Exam, "reviewPolicy" | "availabilityEnd">,
  hasResult: boolean,
  now: Date,
): boolean {
  if (!hasResult || exam.reviewPolicy === "NEVER") return false;
  if (exam.reviewPolicy === "AFTER_WINDOW_CLOSE") return now >= exam.availabilityEnd;
  return true;
}

export function resultToJson(result: AttemptResult) {
  return {
    score: result.score,
    maxScore: result.maxScore,
    percentage: Number(result.percentage),
    correctCount: result.correctCount,
    incorrectCount: result.incorrectCount,
    unansweredCount: result.unansweredCount,
    passed: result.passed,
    timeTakenSeconds: result.timeTakenSeconds,
    computedAt: result.computedAt,
  };
}

export function attemptToView(attempt: LoadedAttempt) {
  const now = new Date();
  const hasResult = Boolean(attempt.result);
  const canReview = reviewAvailable(attempt.exam, hasResult, now);

  return {
    attempt: {
      id: attempt.id,
      status: attempt.status,
      attemptNumber: attempt.attemptNumber,
      startedAt: attempt.startedAt,
      expiresAt: attempt.expiresAt,
      submittedAt: attempt.submittedAt,
      serverTime: now,
    },
    exam: {
      id: attempt.exam.id,
      title: attempt.exam.title,
      description: attempt.exam.description,
      durationMinutes: attempt.exam.durationMinutes,
      marksPerQuestion: attempt.exam.marksPerQuestion,
      negativeMarks: attempt.exam.negativeMarks,
      passPercentage: attempt.exam.passPercentage,
      reviewPolicy: attempt.exam.reviewPolicy,
      availabilityEnd: attempt.exam.availabilityEnd,
      subject: {
        id: attempt.exam.subject?.id ?? 0,
        name: attempt.exam.subject?.name ?? "General",
      },
    },
    questions: attempt.questions.map((question) => {
      const snapshot = parseSnapshot(question.snapshot);
      return {
        id: question.id,
        order: question.order,
        marks: question.marks,
        questionText: snapshot.questionText,
        options: snapshot.options,
        selectedOption: question.answers[0]?.selectedOption ?? null,
        ...(canReview
          ? {
              correctOption: snapshot.correctOption,
              explanation: snapshot.explanation,
            }
          : {}),
      };
    }),
    result: attempt.result ? resultToJson(attempt.result) : null,
    reviewAvailable: canReview,
  };
}

async function loadAttempt(attemptId: number): Promise<LoadedAttempt> {
  const attempt = await prisma.examAttempt.findUnique({
    where: { id: attemptId },
    include: attemptInclude,
  });
  if (!attempt) throw new ApiError(404, "NOT_FOUND", "Exam attempt not found.");
  return attempt;
}

async function loadOwnedAttempt(attemptId: number, studentId: number): Promise<LoadedAttempt> {
  const attempt = await prisma.examAttempt.findFirst({
    where: { id: attemptId, studentId },
    include: attemptInclude,
  });
  if (!attempt) throw new ApiError(404, "NOT_FOUND", "Exam attempt not found.");
  return attempt;
}

export async function getAttemptView(attemptId: number, studentId: number) {
  let attempt = await loadOwnedAttempt(attemptId, studentId);

  const needsFinalizing =
    (attempt.status === "IN_PROGRESS" && attempt.expiresAt <= new Date()) ||
    (attempt.status === "EXPIRED" && !attempt.result);

  if (needsFinalizing) {
    await finalizeAttempt(attempt.id, studentId);
    attempt = await loadOwnedAttempt(attemptId, studentId);
  }

  return attemptToView(attempt);
}

export async function startExamAttempt(examId: number, studentId: number) {
  const exam = await prisma.exam.findUnique({
    where: { id: examId },
    include: {
      subject: { select: { id: true, name: true, status: true } },
      questions: {
        orderBy: { order: "asc" },
        include: {
          question: {
            include: { topic: { select: { id: true, name: true } } },
          },
        },
      },
    },
  });

  if (!exam) throw new ApiError(404, "NOT_FOUND", "Exam not found.");

  const now = new Date();
  if (exam.status !== "PUBLISHED") {
    throw new ApiError(403, "EXAM_NOT_AVAILABLE", "This exam is not available.");
  }
  if (exam.subject && exam.subject.status !== "ACTIVE") {
    throw new ApiError(403, "SUBJECT_INACTIVE", "This subject is not currently available.");
  }
  if (now < exam.availabilityStart) {
    throw new ApiError(403, "EXAM_NOT_STARTED", "This exam is not open yet.");
  }
  if (now > exam.availabilityEnd) {
    throw new ApiError(403, "EXAM_CLOSED", "This exam has closed.");
  }
  if (!exam.questions.length) {
    throw new ApiError(409, "NO_QUESTIONS", "This exam has no questions.");
  }

  const existing = await prisma.examAttempt.findFirst({
    where: { examId, studentId, status: "IN_PROGRESS" },
    orderBy: { attemptNumber: "desc" },
  });

  if (existing) {
    if (existing.expiresAt <= now) {
      await finalizeAttempt(existing.id, studentId);
    } else {
      return getAttemptView(existing.id, studentId);
    }
  }

  const attemptsUsed = await prisma.examAttempt.count({ where: { examId, studentId } });
  if (attemptsUsed >= exam.maxAttempts) {
    throw new ApiError(409, "NO_ATTEMPTS_REMAINING", "You have no attempts remaining for this exam.");
  }

  const expiresAt = new Date(
    Math.min(now.getTime() + exam.durationMinutes * 60_000, exam.availabilityEnd.getTime()),
  );
  const orderedQuestions = exam.shuffleQuestions ? shuffle(exam.questions) : exam.questions;

  let attemptId: number;
  try {
    attemptId = await prisma.$transaction(async (tx) => {
      const attempt = await tx.examAttempt.create({
        data: {
          examId,
          studentId,
          attemptNumber: attemptsUsed + 1,
          startedAt: now,
          expiresAt,
        },
      });

      await tx.examAttemptQuestion.createMany({
        data: orderedQuestions.map((examQuestion, index) => {
          const snapshot = buildSnapshot({
         ...examQuestion.question,
         correctOption: examQuestion.question.correctOption ?? "A",
       });
          const options = exam.shuffleOptions ? shuffle(snapshot.options) : snapshot.options;
          return {
            attemptId: attempt.id,
            questionId: examQuestion.questionId,
            order: index + 1,
            marks: examQuestion.marks,
            snapshot: ({ ...snapshot, options } satisfies QuestionSnapshot) as unknown as Prisma.InputJsonValue,
          };
        }),
      });

      return attempt.id;
    });
  } catch (error) {
    if (error instanceof Error && "code" in error && error.code === "P2002") {
      const inProgress = await prisma.examAttempt.findFirst({
        where: { examId, studentId, status: "IN_PROGRESS" },
      });
      if (inProgress) return getAttemptView(inProgress.id, studentId);
    }
    throw error;
  }

  return getAttemptView(attemptId, studentId);
}

export async function saveAttemptAnswers(
  attemptId: number,
  studentId: number,
  answers: { attemptQuestionId: number; selectedOption: string | null }[],
) {
  const attempt = await prisma.examAttempt.findFirst({
    where: { id: attemptId, studentId },
    include: {
      questions: { select: { id: true, snapshot: true } },
    },
  });
  if (!attempt) throw new ApiError(404, "NOT_FOUND", "Exam attempt not found.");

  const now = new Date();
  if (attempt.expiresAt <= now) {
    await finalizeAttempt(attempt.id, studentId);
    throw new ApiError(409, "ATTEMPT_EXPIRED", "This attempt has expired and was submitted.");
  }
  if (attempt.status !== "IN_PROGRESS") {
    throw new ApiError(409, "ATTEMPT_FINALIZED", "This attempt has already been submitted.");
  }

  const questionMap = new Map(attempt.questions.map((question) => [question.id, question]));
  const seen = new Set<number>();

  for (const answer of answers) {
    const question = questionMap.get(answer.attemptQuestionId);
    if (!question) {
      throw new ApiError(400, "INVALID_QUESTION", "Answer refers to a question outside this attempt.");
    }
    if (seen.has(answer.attemptQuestionId)) {
      throw new ApiError(400, "DUPLICATE_ANSWER", "Duplicate answers for the same question.");
    }
    seen.add(answer.attemptQuestionId);

    if (answer.selectedOption !== null) {
      const options = parseOptions(
        (parseSnapshot(question.snapshot).options as unknown) as Prisma.JsonValue,
      );
      if (!options.some((option) => option.key === answer.selectedOption)) {
        throw new ApiError(400, "INVALID_OPTION", "Selected option is not valid for this question.");
      }
    }
  }

  const savedAt = new Date();
  await prisma.$transaction(async (tx) => {
    for (const answer of answers) {
      await tx.studentAnswer.upsert({
        where: {
          attemptId_attemptQuestionId: {
            attemptId: attempt.id,
            attemptQuestionId: answer.attemptQuestionId,
          },
        },
        create: {
          attemptId: attempt.id,
          attemptQuestionId: answer.attemptQuestionId,
          selectedOption: answer.selectedOption,
        },
        update: { selectedOption: answer.selectedOption },
      });
    }
    await tx.examAttempt.update({
      where: { id: attempt.id },
      data: { lastSavedAt: savedAt },
    });
  });

  return { savedAt };
}

/**
 * Scores an attempt using only server-side snapshots and stored answers.
 * Safe to call repeatedly: the result is upserted and the attempt status is
 * only changed once.
 */
export async function finalizeAttempt(attemptId: number, studentId?: number) {
  const attempt = await loadAttempt(attemptId);
  if (studentId && attempt.studentId !== studentId) {
    throw new ApiError(404, "NOT_FOUND", "Exam attempt not found.");
  }

  if (attempt.result && attempt.status !== "IN_PROGRESS") {
    return attempt.result;
  }

  const now = new Date();
  const isExpired = now > attempt.expiresAt;
  const status: AttemptStatus = attempt.status === "EXPIRED" || isExpired ? "EXPIRED" : "SUBMITTED";
  const submittedAt = attempt.submittedAt ?? (isExpired ? attempt.expiresAt : now);

  const scoring = scoreAttempt(
    attempt.questions.map((question) => {
      const snapshot = parseSnapshot(question.snapshot);
      return {
        marks: question.marks,
        correctOption: snapshot.correctOption,
        selectedOption: question.answers[0]?.selectedOption ?? null,
      };
    }),
    {
      passPercentage: attempt.exam.passPercentage,
      negativeMarks: attempt.exam.negativeMarks,
    },
  );

  const timeTakenSeconds = Math.max(
    0,
    Math.min(
      Math.floor((submittedAt.getTime() - attempt.startedAt.getTime()) / 1000),
      attempt.exam.durationMinutes * 60,
    ),
  );

  const result = await prisma.$transaction(async (tx) => {
    await tx.examAttempt.updateMany({
      where: { id: attempt.id, status: { in: ["IN_PROGRESS", "EXPIRED"] } },
      data: { status, submittedAt },
    });

    return tx.attemptResult.upsert({
      where: { attemptId: attempt.id },
      create: {
        attemptId: attempt.id,
        score: scoring.score,
        maxScore: scoring.maxScore,
        percentage: scoring.percentage,
        correctCount: scoring.correctCount,
        incorrectCount: scoring.incorrectCount,
        unansweredCount: scoring.unansweredCount,
        passed: scoring.passed,
        timeTakenSeconds,
      },
      update: {
        score: scoring.score,
        maxScore: scoring.maxScore,
        percentage: scoring.percentage,
        correctCount: scoring.correctCount,
        incorrectCount: scoring.incorrectCount,
        unansweredCount: scoring.unansweredCount,
        passed: scoring.passed,
        timeTakenSeconds,
      },
    });
  });

  return result;
}

export async function listStudentExams(studentId: number) {
  const exams = await prisma.exam.findMany({
    where: { status: "PUBLISHED", subject: { status: "ACTIVE" } },
    orderBy: { availabilityStart: "asc" },
    select: {
      id: true,
      title: true,
      description: true,
      durationMinutes: true,
      passPercentage: true,
      maxAttempts: true,
      availabilityStart: true,
      availabilityEnd: true,
      subject: { select: { id: true, name: true, status: true } },
      _count: { select: { questions: true } },
      attempts: {
        where: { studentId },
        orderBy: { attemptNumber: "desc" },
        select: {
          id: true,
          status: true,
          attemptNumber: true,
          expiresAt: true,
          result: { select: { percentage: true, passed: true } },
        },
      },
    },
  });

  const now = new Date();
  return exams.map((exam) => ({
    id: exam.id,
    title: exam.title,
    description: exam.description,
    durationMinutes: exam.durationMinutes,
    passPercentage: exam.passPercentage,
    maxAttempts: exam.maxAttempts,
    availabilityStart: exam.availabilityStart,
    availabilityEnd: exam.availabilityEnd,
    questionCount: exam._count.questions,
    subject: {
      id: exam.subject?.id ?? 0,
      name: exam.subject?.name ?? "General",
      status: exam.subject?.status ?? "ACTIVE",
    },
    attempts: exam.attempts.map((attempt) => ({
      id: attempt.id,
      status: attempt.status,
      attemptNumber: attempt.attemptNumber,
      expiresAt: attempt.expiresAt,
      percentage: attempt.result ? Number(attempt.result.percentage) : null,
      passed: attempt.result?.passed ?? null,
    })),
    availability:
      now < exam.availabilityStart ? "UPCOMING" : now > exam.availabilityEnd ? "CLOSED" : "OPEN",
    attemptsUsed: exam.attempts.length,
    attemptsRemaining: Math.max(0, exam.maxAttempts - exam.attempts.length),
  }));
}

export async function getStudentExamDetail(examId: number, studentId: number) {
  const exam = await prisma.exam.findUnique({
    where: { id: examId },
    select: {
      id: true,
      title: true,
      description: true,
      durationMinutes: true,
      passPercentage: true,
      maxAttempts: true,
      marksPerQuestion: true,
      negativeMarks: true,
      reviewPolicy: true,
      availabilityStart: true,
      availabilityEnd: true,
      status: true,
      subject: { select: { id: true, name: true, status: true } },
      _count: { select: { questions: true } },
      attempts: {
        where: { studentId },
        orderBy: { attemptNumber: "desc" },
        select: {
          id: true,
          status: true,
          attemptNumber: true,
          startedAt: true,
          submittedAt: true,
          result: { select: { percentage: true, passed: true } },
        },
      },
    },
  });

  if (!exam || exam.status !== "PUBLISHED" || (exam.subject && exam.subject.status !== "ACTIVE")) {
    throw new ApiError(404, "NOT_FOUND", "Exam not found.");
  }

  const now = new Date();
  return {
    ...exam,
    questionCount: exam._count.questions,
    subject: {
      id: exam.subject?.id ?? 0,
      name: exam.subject?.name ?? "General",
      status: exam.subject?.status ?? "ACTIVE",
    },
    availability:
      now < exam.availabilityStart ? "UPCOMING" : now > exam.availabilityEnd ? "CLOSED" : "OPEN",
    attempts: exam.attempts.map((attempt) => ({
      ...attempt,
      percentage: attempt.result ? Number(attempt.result.percentage) : null,
      passed: attempt.result?.passed ?? null,
    })),
    attemptsUsed: exam.attempts.length,
    attemptsRemaining: Math.max(0, exam.maxAttempts - exam.attempts.length),
  };
}

export type { LoadedAttempt };
