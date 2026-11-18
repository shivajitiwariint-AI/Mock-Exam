import { noContent, ok, parseJson } from "@/lib/api";
import { requireSubjectManage } from "@/lib/authz";
import { prisma } from "@/lib/db";
import { safeRecordAudit } from "@/lib/audit";
import { ApiError, withApi } from "@/lib/errors";
import { resolveQuestionIds } from "@/lib/exam-admin";
import { updateExamSchema } from "@/lib/validation";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

async function loadExam(examId: string) {
  const exam = await prisma.exam.findUnique({
    where: { id: examId },
    select: {
      id: true,
      subjectId: true,
      topicId: true,
      status: true,
      title: true,
      marksPerQuestion: true,
      negativeMarks: true,
      availabilityStart: true,
      availabilityEnd: true,
      _count: { select: { attempts: true } },
    },
  });
  if (!exam) throw new ApiError(404, "NOT_FOUND", "Exam not found.");
  return exam;
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ examId: string }> },
) {
  return withApi(async () => {
    const { examId } = await params;
    const summary = await loadExam(examId);
    await requireSubjectManage(summary.subjectId);

    const exam = await prisma.exam.findUnique({
      where: { id: examId },
      select: {
        id: true,
        subjectId: true,
        title: true,
        description: true,
        status: true,
        durationMinutes: true,
        passPercentage: true,
        marksPerQuestion: true,
        negativeMarks: true,
        maxAttempts: true,
        shuffleQuestions: true,
        shuffleOptions: true,
        reviewPolicy: true,
        availabilityStart: true,
        availabilityEnd: true,
        publishedAt: true,
        createdAt: true,
        updatedAt: true,
        topic: { select: { id: true, name: true } },
        createdBy: { select: { id: true, name: true, email: true } },
        questions: {
          orderBy: { order: "asc" },
          select: {
            id: true,
            order: true,
            marks: true,
            question: {
              select: {
                id: true,
                questionText: true,
                options: true,
                correctOption: true,
                explanation: true,
                difficulty: true,
                status: true,
                topic: { select: { id: true, name: true } },
              },
            },
          },
        },
        _count: { select: { attempts: true } },
      },
    });
    if (!exam) throw new ApiError(404, "NOT_FOUND", "Exam not found.");
    return ok({ ...exam, attemptCount: exam._count.attempts });
  });
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ examId: string }> },
) {
  return withApi(async () => {
    const { examId } = await params;
    const existing = await loadExam(examId);
    const { user } = await requireSubjectManage(existing.subjectId);
    const data = await parseJson(request, updateExamSchema);

    const effectiveTopicId = data.topicId === undefined ? existing.topicId : data.topicId ?? null;
    const effectiveStart = data.availabilityStart ?? existing.availabilityStart;
    const effectiveEnd = data.availabilityEnd ?? existing.availabilityEnd;
    const effectiveMarks = data.marksPerQuestion ?? existing.marksPerQuestion;
    const effectiveNegative = data.negativeMarks ?? existing.negativeMarks;

    if (effectiveEnd <= effectiveStart) {
      throw new ApiError(422, "INVALID_WINDOW", "Availability end must be after the start time.");
    }
    if (effectiveNegative > effectiveMarks) {
      throw new ApiError(
        422,
        "INVALID_NEGATIVE_MARKS",
        "Negative marks cannot exceed marks per question.",
      );
    }

    if (effectiveTopicId) {
      const topic = await prisma.topic.findFirst({
        where: { id: effectiveTopicId, subjectId: existing.subjectId },
        select: { id: true },
      });
      if (!topic) {
        throw new ApiError(400, "INVALID_TOPIC", "Topic does not belong to this subject.");
      }
    }

    const changesQuestions = data.questionIds !== undefined || data.randomCount !== undefined;
    let questionIds: string[] | null = null;

    if (changesQuestions) {
      if (existing.status === "PUBLISHED") {
        throw new ApiError(
          409,
          "EXAM_PUBLISHED",
          "Unpublish the exam before changing its questions.",
        );
      }
      if (existing._count.attempts > 0) {
        throw new ApiError(
          409,
          "EXAM_HAS_ATTEMPTS",
          "Questions cannot be changed after students have attempted this exam.",
        );
      }
      questionIds = await resolveQuestionIds({
        subjectId: existing.subjectId,
        topicId: effectiveTopicId,
        questionIds: data.questionIds,
        randomCount: data.randomCount,
      });
    }

    if (existing.status === "ARCHIVED" && data.questionIds !== undefined) {
      throw new ApiError(409, "EXAM_ARCHIVED", "Archived exams cannot be edited.");
    }

    const exam = await prisma.$transaction(async (tx) => {
      if (questionIds) {
        await tx.examQuestion.deleteMany({ where: { examId } });
        await tx.examQuestion.createMany({
          data: questionIds.map((questionId, index) => ({
            examId,
            questionId,
            order: index + 1,
            marks: effectiveMarks,
          })),
        });
      } else if (data.marksPerQuestion !== undefined) {
        await tx.examQuestion.updateMany({ where: { examId }, data: { marks: effectiveMarks } });
      }

      return tx.exam.update({
        where: { id: examId },
        data: {
          title: data.title,
          description: data.description === undefined ? undefined : data.description ?? null,
          topicId: data.topicId === undefined ? undefined : data.topicId ?? null,
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
        },
        select: {
          id: true,
          title: true,
          status: true,
          updatedAt: true,
          _count: { select: { questions: true } },
        },
      });
    });

    await safeRecordAudit({
      actorId: user.id,
      action: "EXAM_UPDATED",
      entityType: "Exam",
      entityId: examId,
      metadata: { subjectId: existing.subjectId, questionsChanged: changesQuestions },
    });

    return ok({ ...exam, questionCount: exam._count.questions });
  });
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ examId: string }> },
) {
  return withApi(async () => {
    const { examId } = await params;
    const existing = await loadExam(examId);
    const { user } = await requireSubjectManage(existing.subjectId);

    await prisma.exam.update({ where: { id: examId }, data: { status: "ARCHIVED" } });

    await safeRecordAudit({
      actorId: user.id,
      action: "EXAM_ARCHIVED",
      entityType: "Exam",
      entityId: examId,
      metadata: { subjectId: existing.subjectId },
    });

    return noContent();
  });
}
