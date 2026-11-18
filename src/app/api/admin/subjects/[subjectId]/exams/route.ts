import type { ExamStatus } from "@prisma/client";
import { created, ok, paginated, parseJson, parsePagination } from "@/lib/api";
import { requireSubjectManage } from "@/lib/authz";
import { prisma } from "@/lib/db";
import { safeRecordAudit } from "@/lib/audit";
import { ApiError, withApi } from "@/lib/errors";
import { resolveQuestionIds } from "@/lib/exam-admin";
import { createExamSchema } from "@/lib/validation";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ subjectId: string }> },
) {
  return withApi(async () => {
    const { subjectId } = await params;
    await requireSubjectManage(subjectId);
    const url = new URL(request.url);
    const { page, pageSize, skip, take } = parsePagination(url);
    const statusParam = url.searchParams.get("status");
    const status: ExamStatus | undefined =
      statusParam === "DRAFT" ||
      statusParam === "PUBLISHED" ||
      statusParam === "UNPUBLISHED" ||
      statusParam === "ARCHIVED"
        ? statusParam
        : undefined;

    const where = { subjectId, ...(status ? { status } : {}) };
    const [total, exams] = await Promise.all([
      prisma.exam.count({ where }),
      prisma.exam.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip,
        take,
        select: {
          id: true,
          title: true,
          description: true,
          status: true,
          durationMinutes: true,
          passPercentage: true,
          marksPerQuestion: true,
          negativeMarks: true,
          maxAttempts: true,
          reviewPolicy: true,
          availabilityStart: true,
          availabilityEnd: true,
          publishedAt: true,
          createdAt: true,
          topic: { select: { id: true, name: true } },
          _count: { select: { questions: true, attempts: true } },
        },
      }),
    ]);

    return ok(
      paginated(
        exams.map((exam) => ({
          ...exam,
          questionCount: exam._count.questions,
          attemptCount: exam._count.attempts,
        })),
        total,
        page,
        pageSize,
      ),
    );
  });
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ subjectId: string }> },
) {
  return withApi(async () => {
    const { subjectId } = await params;
    const { user } = await requireSubjectManage(subjectId);
    const data = await parseJson(request, createExamSchema);

    if (data.topicId) {
      const topic = await prisma.topic.findFirst({
        where: { id: data.topicId, subjectId },
        select: { id: true },
      });
      if (!topic) {
        throw new ApiError(400, "INVALID_TOPIC", "Topic does not belong to this subject.");
      }
    }

    const questionIds = await resolveQuestionIds({
      subjectId,
      topicId: data.topicId,
      questionIds: data.questionIds,
      randomCount: data.randomCount,
    });

    const exam = await prisma.exam.create({
      data: {
        subjectId,
        topicId: data.topicId ?? null,
        createdById: user.id,
        title: data.title,
        description: data.description ?? null,
        durationMinutes: data.durationMinutes,
        passPercentage: data.passPercentage,
        marksPerQuestion: data.marksPerQuestion,
        negativeMarks: data.negativeMarks,
        maxAttempts: data.maxAttempts,
        shuffleQuestions: data.shuffleQuestions,
        shuffleOptions: data.shuffleOptions,
        reviewPolicy: data.reviewPolicy,
        availabilityStart: data.availabilityStart,
        availabilityEnd: data.availabilityEnd,
        status: "DRAFT",
        questions: {
          create: questionIds.map((questionId, index) => ({
            questionId,
            order: index + 1,
            marks: data.marksPerQuestion,
          })),
        },
      },
      select: {
        id: true,
        title: true,
        status: true,
        durationMinutes: true,
        availabilityStart: true,
        availabilityEnd: true,
        createdAt: true,
        _count: { select: { questions: true } },
      },
    });

    await safeRecordAudit({
      actorId: user.id,
      action: "EXAM_CREATED",
      entityType: "Exam",
      entityId: exam.id,
      metadata: { subjectId, questionCount: questionIds.length },
    });

    return created({ ...exam, questionCount: exam._count.questions });
  });
}
