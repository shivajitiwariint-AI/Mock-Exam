import type { Prisma, UserStatus } from "@prisma/client";
import { prisma } from "./db";
import { roundPercentage } from "./scoring";

const MAX_RECENT_KITS = 5;

type SubjectAccumulator = {
  id: string;
  name: string;
  attempts: number;
  totalPercentage: number;
  scoredAttempts: number;
  best: number | null;
  lastAttemptAt: Date | null;
};

type ExamAccumulator = {
  totalAttempts: number;
  completedAttempts: number;
  inProgressAttempts: number;
  totalPercentage: number;
  scoredAttempts: number;
  subjects: Map<string, SubjectAccumulator>;
};

type InterviewKit = {
  id: string;
  title: string;
  company: string | null;
  role: string | null;
  status: string;
  questionCount: number;
  sessionCount: number;
  latestScore: number | null;
  proctorEventCount: number;
  proctorFlagCount: number;
  createdAt: Date;
};

type InterviewAccumulator = {
  kits: number;
  readyKits: number;
  questions: number;
  sessions: number;
  completedSessions: number;
  totalScore: number;
  scoredSessions: number;
  lastActivityAt: Date | null;
  recentKits: InterviewKit[];
};

export type AdminStudentProgressItem = {
  id: string;
  name: string;
  email: string;
  status: UserStatus;
  createdAt: Date;
  lastLoginAt: Date | null;
  exams: {
    totalAttempts: number;
    completedAttempts: number;
    inProgressAttempts: number;
    averagePercentage: number;
    subjects: {
      id: string;
      name: string;
      attempts: number;
      average: number;
      best: number | null;
      lastAttemptAt: Date | null;
    }[];
  };
  interviews: {
    kits: number;
    readyKits: number;
    questions: number;
    sessions: number;
    completedSessions: number;
    averageScore: number | null;
    lastActivityAt: Date | null;
    recentKits: InterviewKit[];
  };
};

export async function getAdminStudentProgress(
  search: string,
  skip: number,
  take: number,
): Promise<{ items: AdminStudentProgressItem[]; total: number }> {
  const where: Prisma.UserWhereInput = { role: "STUDENT" };
  if (search) {
    where.OR = [
      { name: { contains: search } },
      { email: { contains: search } },
    ];
  }

  const [total, students] = await prisma.$transaction([
    prisma.user.count({ where }),
    prisma.user.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip,
      take,
      select: {
        id: true,
        name: true,
        email: true,
        status: true,
        createdAt: true,
        lastLoginAt: true,
      },
    }),
  ]);

  if (!students.length) return { items: [], total };

  const ids = students.map((student) => student.id);

  const [attempts, preps, sessionGroups, completedGroups] = await Promise.all([
    prisma.examAttempt.findMany({
      where: { studentId: { in: ids } },
      select: {
        studentId: true,
        status: true,
        startedAt: true,
        exam: {
          select: {
            subjectId: true,
            subject: { select: { name: true } },
          },
        },
        result: { select: { percentage: true, computedAt: true } },
      },
    }),
    prisma.interviewPrep.findMany({
      where: { userId: { in: ids } },
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        userId: true,
        title: true,
        company: true,
        role: true,
        status: true,
        proctorEventCount: true,
        proctorFlagCount: true,
        createdAt: true,
        updatedAt: true,
        _count: { select: { questions: true, sessions: true } },
        sessions: {
          orderBy: { startedAt: "desc" },
          take: 1,
          select: { status: true, overallScore: true, startedAt: true },
        },
      },
    }),
    prisma.interviewSession.groupBy({
      by: ["userId"],
      where: { userId: { in: ids } },
      _count: { _all: true },
      _avg: { overallScore: true },
    }),
    prisma.interviewSession.groupBy({
      by: ["userId"],
      where: { userId: { in: ids }, status: "COMPLETED" },
      _count: { _all: true },
    }),
  ]);

  const examMap = new Map<string, ExamAccumulator>();
  for (const id of ids) {
    examMap.set(id, {
      totalAttempts: 0,
      completedAttempts: 0,
      inProgressAttempts: 0,
      totalPercentage: 0,
      scoredAttempts: 0,
      subjects: new Map(),
    });
  }

  for (const attempt of attempts) {
    const entry = examMap.get(attempt.studentId);
    if (!entry) continue;

    entry.totalAttempts += 1;
    if (attempt.status === "IN_PROGRESS") {
      entry.inProgressAttempts += 1;
    } else {
      entry.completedAttempts += 1;
    }

    const percentage = attempt.result ? Number(attempt.result.percentage) : null;
    if (percentage !== null) {
      entry.totalPercentage += percentage;
      entry.scoredAttempts += 1;
    }

    const subjectId = attempt.exam.subjectId;
    const subject =
      entry.subjects.get(subjectId) ??
      {
        id: subjectId,
        name: attempt.exam.subject.name,
        attempts: 0,
        totalPercentage: 0,
        scoredAttempts: 0,
        best: null,
        lastAttemptAt: null,
      };
    subject.attempts += 1;
    if (percentage !== null) {
      subject.totalPercentage += percentage;
      subject.scoredAttempts += 1;
      subject.best = subject.best === null ? percentage : Math.max(subject.best, percentage);
    }
    if (!subject.lastAttemptAt || attempt.startedAt > subject.lastAttemptAt) {
      subject.lastAttemptAt = attempt.startedAt;
    }
    entry.subjects.set(subjectId, subject);
  }

  const interviewMap = new Map<string, InterviewAccumulator>();
  for (const id of ids) {
    interviewMap.set(id, {
      kits: 0,
      readyKits: 0,
      questions: 0,
      sessions: 0,
      completedSessions: 0,
      totalScore: 0,
      scoredSessions: 0,
      lastActivityAt: null,
      recentKits: [],
    });
  }

  for (const prep of preps) {
    const entry = interviewMap.get(prep.userId);
    if (!entry) continue;

    entry.kits += 1;
    if (prep.status === "READY") entry.readyKits += 1;
    entry.questions += prep._count.questions;
    entry.sessions += prep._count.sessions;

    const latestSession = prep.sessions[0] ?? null;
    const latestScore =
      latestSession?.status === "COMPLETED" && latestSession.overallScore !== null
        ? latestSession.overallScore
        : null;

    const activity = latestSession?.startedAt ?? prep.updatedAt;
    if (!entry.lastActivityAt || activity > entry.lastActivityAt) {
      entry.lastActivityAt = activity;
    }

    if (entry.recentKits.length < MAX_RECENT_KITS) {
      entry.recentKits.push({
        id: prep.id,
        title: prep.title,
        company: prep.company,
        role: prep.role,
        status: prep.status,
        questionCount: prep._count.questions,
        sessionCount: prep._count.sessions,
        latestScore,
        proctorEventCount: prep.proctorEventCount,
        proctorFlagCount: prep.proctorFlagCount,
        createdAt: prep.createdAt,
      });
    }
  }

  const sessionMap = new Map(
    sessionGroups.map((group) => [
      group.userId,
      {
        sessions: group._count._all,
        averageScore:
          group._avg.overallScore === null ? null : roundPercentage(Number(group._avg.overallScore)),
      },
    ]),
  );
  const completedMap = new Map(
    completedGroups.map((group) => [group.userId, group._count._all]),
  );

  const items = students.map((student) => {
    const exam = examMap.get(student.id);
    const interview = interviewMap.get(student.id);
    const sessionStats = sessionMap.get(student.id);
    const completedSessions = completedMap.get(student.id) ?? 0;

    return {
      id: student.id,
      name: student.name,
      email: student.email,
      status: student.status,
      createdAt: student.createdAt,
      lastLoginAt: student.lastLoginAt,
      exams: {
        totalAttempts: exam?.totalAttempts ?? 0,
        completedAttempts: exam?.completedAttempts ?? 0,
        inProgressAttempts: exam?.inProgressAttempts ?? 0,
        averagePercentage:
          exam && exam.scoredAttempts > 0
            ? roundPercentage(exam.totalPercentage / exam.scoredAttempts)
            : 0,
        subjects: exam
          ? [...exam.subjects.values()]
              .map((subject) => ({
                id: subject.id,
                name: subject.name,
                attempts: subject.attempts,
                average:
                  subject.scoredAttempts > 0
                    ? roundPercentage(subject.totalPercentage / subject.scoredAttempts)
                    : 0,
                best: subject.best === null ? null : roundPercentage(subject.best),
                lastAttemptAt: subject.lastAttemptAt,
              }))
              .sort((a, b) => a.name.localeCompare(b.name))
          : [],
      },
      interviews: {
        kits: interview?.kits ?? 0,
        readyKits: interview?.readyKits ?? 0,
        questions: interview?.questions ?? 0,
        sessions: sessionStats?.sessions ?? interview?.sessions ?? 0,
        completedSessions,
        averageScore:
          completedSessions > 0 ? (sessionStats?.averageScore ?? null) : null,
        lastActivityAt: interview?.lastActivityAt ?? null,
        recentKits: interview?.recentKits ?? [],
      },
    };
  });

  return { items, total };
}
