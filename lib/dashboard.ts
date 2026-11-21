import type { Prisma } from "@/app/generated/prisma/client";
import type { CurrentUser } from "./authz";
import { accessibleSubjectIds } from "./authz";
import { prisma } from "./db";
import { roundPercentage } from "./scoring";

type SubjectStatRow = {
  id: number;
  name: string;
  attempts: number;
  average: number;
  best: number | null;
};

export async function getStudentDashboard(studentId: number) {
  const [summaryRows, inProgressAttempts, subjectStats] = await Promise.all([
    prisma.attemptResult.aggregate({
      where: { attempt: { studentId } },
      _count: { _all: true },
      _avg: { percentage: true },
      _max: { percentage: true },
    }),
    prisma.examAttempt.count({ where: { studentId, status: "IN_PROGRESS" } }),
    prisma.$queryRaw<SubjectStatRow[]>`
      SELECT
        s.id AS id,
        s.name AS name,
        COUNT(r.id) AS attempts,
        COALESCE(AVG(r.percentage), 0) AS average,
        MAX(r.percentage) AS best
      FROM exam_attempts a
      JOIN exams e ON e.id = a.examId
      JOIN subjects s ON s.id = e.subjectId
      JOIN attempt_results r ON r.attemptId = a.id
      WHERE a.studentId = ${studentId}
      GROUP BY s.id, s.name
      ORDER BY s.name ASC
    `,
  ]);

  const recentAttempts = await prisma.examAttempt.findMany({
    where: { studentId },
    orderBy: { startedAt: "desc" },
    take: 6,
    select: {
      id: true,
      status: true,
      attemptNumber: true,
      startedAt: true,
      submittedAt: true,
      exam: {
        select: {
          id: true,
          title: true,
          subject: { select: { id: true, name: true } },
        },
      },
      result: {
        select: {
          percentage: true,
          passed: true,
          score: true,
          maxScore: true,
          timeTakenSeconds: true,
        },
      },
    },
  });

  const trendRows = await prisma.attemptResult.findMany({
    where: { attempt: { studentId } },
    orderBy: { computedAt: "desc" },
    take: 10,
    select: {
      percentage: true,
      computedAt: true,
      attempt: {
        select: {
          exam: { select: { title: true, subject: { select: { name: true } } } },
        },
      },
    },
  });

  const recentQuestionRows = await prisma.examAttemptQuestion.findMany({
    where: {
      attempt: { studentId, status: { in: ["SUBMITTED", "EXPIRED"] } },
    },
    orderBy: { createdAt: "desc" },
    take: 500,
    select: {
      snapshot: true,
      answers: { select: { selectedOption: true } },
      attempt: {
        select: {
          exam: { select: { subject: { select: { name: true } } } },
        },
      },
    },
  });

  const topicMap = new Map<
    string,
    { topic: string; subject: string; total: number; correct: number }
  >();

  for (const row of recentQuestionRows) {
    const snapshot = row.snapshot as {
      topicName?: string | null;
      subjectName?: string | null;
      correctOption?: string;
    };
    if (!snapshot || typeof snapshot.correctOption !== "string") continue;
    const topic = snapshot.topicName?.trim() || "General";
    const subject = snapshot.subjectName?.trim() || row.attempt.exam.subject?.name || "General";
    const key = `${subject}::${topic}`;
    const entry = topicMap.get(key) ?? { topic, subject, total: 0, correct: 0 };
    entry.total += 1;
    if (row.answers[0]?.selectedOption === snapshot.correctOption) {
      entry.correct += 1;
    }
    topicMap.set(key, entry);
  }

  const weakTopics = [...topicMap.values()]
    .filter((entry) => entry.total >= 3)
    .map((entry) => ({
      ...entry,
      accuracy: roundPercentage((entry.correct / entry.total) * 100),
    }))
    .sort((a, b) => a.accuracy - b.accuracy)
    .slice(0, 4);

  return {
    summary: {
      totalAttempts: Number(summaryRows._count._all) + inProgressAttempts,
      completedAttempts: Number(summaryRows._count._all),
      inProgressAttempts,
      averagePercentage: roundPercentage(Number(summaryRows._avg.percentage ?? 0)),
      bestPercentage:
        summaryRows._max.percentage === null
          ? null
          : roundPercentage(Number(summaryRows._max.percentage)),
    },
    subjectPerformance: subjectStats.map((row) => ({
      id: row.id,
      name: row.name,
      attempts: Number(row.attempts),
      average: roundPercentage(Number(row.average)),
      best: row.best === null ? null : roundPercentage(Number(row.best)),
    })),
    trend: trendRows.reverse().map((row) => ({
      percentage: Number(row.percentage),
      date: row.computedAt,
      examTitle: row.attempt.exam.title,
      subject: row.attempt.exam.subject?.name ?? "General",
    })),
    weakTopics,
    recentAttempts: recentAttempts.map((attempt) => ({
      id: attempt.id,
      status: attempt.status,
      attemptNumber: attempt.attemptNumber,
      startedAt: attempt.startedAt,
      submittedAt: attempt.submittedAt,
      exam: attempt.exam,
      percentage: attempt.result ? Number(attempt.result.percentage) : null,
      passed: attempt.result?.passed ?? null,
      score: attempt.result?.score ?? null,
      maxScore: attempt.result?.maxScore ?? null,
      timeTakenSeconds: attempt.result?.timeTakenSeconds ?? null,
    })),
  };
}

export async function getStudentHistory(studentId: number, skip: number, take: number) {
  const where = { studentId };
  const [total, attempts] = await Promise.all([
    prisma.examAttempt.count({ where }),
    prisma.examAttempt.findMany({
      where,
      orderBy: { startedAt: "desc" },
      skip,
      take,
      select: {
        id: true,
        status: true,
        attemptNumber: true,
        startedAt: true,
        submittedAt: true,
        exam: {
          select: {
            id: true,
            title: true,
            subject: { select: { id: true, name: true } },
          },
        },
        result: {
          select: {
            percentage: true,
            passed: true,
            score: true,
            maxScore: true,
            timeTakenSeconds: true,
          },
        },
      },
    }),
  ]);

  return {
    items: attempts.map((attempt) => ({
      id: attempt.id,
      status: attempt.status,
      attemptNumber: attempt.attemptNumber,
      startedAt: attempt.startedAt,
      submittedAt: attempt.submittedAt,
      exam: attempt.exam,
      percentage: attempt.result ? Number(attempt.result.percentage) : null,
      passed: attempt.result?.passed ?? null,
      score: attempt.result?.score ?? null,
      maxScore: attempt.result?.maxScore ?? null,
      timeTakenSeconds: attempt.result?.timeTakenSeconds ?? null,
    })),
    total,
  };
}

export async function getAdminDashboard(user: CurrentUser) {
  const subjectIds = await accessibleSubjectIds(user);
  const subjectFilter: Prisma.SubjectWhereInput =
    subjectIds === null ? {} : { id: { in: subjectIds } };
  const directSubjectFilter: { subjectId?: { in: number[] } } =
    subjectIds === null ? {} : { subjectId: { in: subjectIds } };
  const attemptSubjectFilter: Prisma.ExamAttemptWhereInput =
    subjectIds === null ? {} : { exam: { subjectId: { in: subjectIds } } };
  const resultSubjectFilter: Prisma.AttemptResultWhereInput =
    subjectIds === null ? {} : { attempt: { exam: { subjectId: { in: subjectIds } } } };

  const [
    subjectCount,
    documentGroups,
    questionGroups,
    examGroups,
    attemptCount,
    resultAggregate,
    pendingQuestions,
    failedDocuments,
    recentExams,
    userCounts,
  ] = await Promise.all([
    prisma.subject.count({ where: subjectFilter }),
    prisma.document.groupBy({
      by: ["status"],
      where: directSubjectFilter,
      _count: { _all: true },
    }),
    prisma.question.groupBy({
      by: ["status"],
      where: directSubjectFilter,
      _count: { _all: true },
    }),
    prisma.exam.groupBy({
      by: ["status"],
      where: directSubjectFilter,
      _count: { _all: true },
    }),
    prisma.examAttempt.count({ where: attemptSubjectFilter }),
    prisma.attemptResult.aggregate({
      where: resultSubjectFilter,
      _avg: { percentage: true },
    }),
    prisma.question.findMany({
      where: { ...directSubjectFilter, status: "PENDING_REVIEW" },
      orderBy: { createdAt: "asc" },
      take: 6,
      select: {
        id: true,
        questionText: true,
        createdAt: true,
        source: true,
        subject: { select: { id: true, name: true } },
      },
    }),
    prisma.document.findMany({
      where: { ...directSubjectFilter, status: "FAILED" },
      orderBy: { updatedAt: "desc" },
      take: 5,
      select: {
        id: true,
        originalFilename: true,
        errorMessage: true,
        updatedAt: true,
        subject: { select: { id: true, name: true } },
      },
    }),
    prisma.exam.findMany({
      where: directSubjectFilter,
      orderBy: { createdAt: "desc" },
      take: 5,
      select: {
        id: true,
        title: true,
        status: true,
        availabilityStart: true,
        availabilityEnd: true,
        subject: { select: { id: true, name: true } },
        _count: { select: { attempts: true, questions: true } },
      },
    }),
    user.role === "SUPER_ADMIN"
      ? Promise.all([
          prisma.user.count(),
          prisma.user.count({ where: { status: "ACTIVE" } }),
          prisma.user.count({ where: { role: "STUDENT" } }),
          prisma.user.count({ where: { role: "SUBJECT_ADMIN" } }),
        ])
      : Promise.resolve(null),
  ]);

  const documentStatuses = Object.fromEntries(
    documentGroups.map((group) => [group.status, group._count._all]),
  );
  const questionStatuses = Object.fromEntries(
    questionGroups.map((group) => [group.status, group._count._all]),
  );
  const examStatuses = Object.fromEntries(
    examGroups.map((group) => [group.status, group._count._all]),
  );

  return {
    scope: subjectIds === null ? ("platform" as const) : ("subjects" as const),
    subjects: Number(subjectCount),
    documents: {
      total: Object.values(documentStatuses).reduce((sum, count) => sum + Number(count), 0),
      uploaded: Number(documentStatuses.UPLOADED ?? 0),
      processing: Number(documentStatuses.PROCESSING ?? 0),
      processed: Number(documentStatuses.PROCESSED ?? 0),
      failed: Number(documentStatuses.FAILED ?? 0),
    },
    questions: {
      total: Object.values(questionStatuses).reduce((sum, count) => sum + Number(count), 0),
      pendingReview: Number(questionStatuses.PENDING_REVIEW ?? 0),
      approved: Number(questionStatuses.APPROVED ?? 0),
      draft: Number(questionStatuses.DRAFT ?? 0),
      rejected: Number(questionStatuses.REJECTED ?? 0),
      archived: Number(questionStatuses.ARCHIVED ?? 0),
    },
    exams: {
      total: Object.values(examStatuses).reduce((sum, count) => sum + Number(count), 0),
      published: Number(examStatuses.PUBLISHED ?? 0),
      draft: Number(examStatuses.DRAFT ?? 0),
      unpublished: Number(examStatuses.UNPUBLISHED ?? 0),
      archived: Number(examStatuses.ARCHIVED ?? 0),
    },
    participation: {
      attempts: Number(attemptCount),
      averagePercentage: roundPercentage(Number(resultAggregate._avg?.percentage ?? 0)),
    },
    users: userCounts
      ? {
          total: Number(userCounts[0]),
          active: Number(userCounts[1]),
          students: Number(userCounts[2]),
          subjectAdmins: Number(userCounts[3]),
        }
      : null,
    pendingQuestions,
    failedDocuments,
    recentExams: recentExams.map((exam) => ({
      ...exam,
      attemptCount: exam._count.attempts,
      questionCount: exam._count.questions,
    })),
  };
}
