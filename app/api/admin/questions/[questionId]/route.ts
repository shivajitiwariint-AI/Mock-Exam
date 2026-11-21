import { noContent, ok, parseJson } from "@/lib/api";
import { requireSubjectManage } from "@/lib/authz";
import { prisma } from "@/lib/db";
import { safeRecordAudit } from "@/lib/audit";
import { ApiError, withApi } from "@/lib/errors";
import { questionContentHash } from "@/lib/question-utils";
import { updateQuestionSchema } from "@/lib/validation";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

async function loadQuestion(questionId: number) {
  const question = await prisma.question.findUnique({
    where: { id: questionId },
    select: { id: true, subjectId: true, status: true },
  });
  if (!question) throw new ApiError(404, "NOT_FOUND", "Question not found.");
  return question;
}

export async function GET(
  _request: Request,
  { params }: { params: { questionId: string } },
) {
  return withApi(async () => {
    const questionId = Number((await params).questionId);
    const summary = await loadQuestion(questionId);
    await requireSubjectManage(summary.subjectId);

    const question = await prisma.question.findUnique({
      where: { id: questionId },
      select: {
        id: true,
        subjectId: true,
        type: true,
        questionText: true,
        options: true,
        correctOption: true,
        explanation: true,
        difficulty: true,
        status: true,
        source: true,
        aiModel: true,
        createdAt: true,
        updatedAt: true,
        reviewedAt: true,
        topic: { select: { id: true, name: true } },
        createdBy: { select: { id: true, name: true, email: true } },
      },
    });
    if (!question) throw new ApiError(404, "NOT_FOUND", "Question not found.");
    return ok(question);
  });
}

export async function PATCH(
  request: Request,
  { params }: { params: { questionId: string } },
) {
  return withApi(async () => {
    const questionId = Number((await params).questionId);
    const existing = await loadQuestion(questionId);
    const { user } = await requireSubjectManage(existing.subjectId);
    const data = await parseJson(request, updateQuestionSchema);

    if (data.topicId) {
      const topic = await prisma.topic.findFirst({
        where: {
          id: data.topicId,
          ...(existing.subjectId === null ? {} : { subjectId: existing.subjectId }),
        },
        select: { id: true },
      });
      if (!topic) {
        throw new ApiError(400, "INVALID_TOPIC", "Topic does not belong to this subject.");
      }
    }

    const options = data.type === "SUBJECTIVE" ? [] : data.options;
    const correctOption = data.type === "SUBJECTIVE" ? null : data.correctOption ?? null;
    const contentHash = questionContentHash(data.questionText, options);
    const duplicate = await prisma.question.findFirst({
      where: {
        subjectId: existing.subjectId,
        contentHash,
        id: { not: questionId },
      },
      select: { id: true },
    });
    if (duplicate) {
      throw new ApiError(409, "DUPLICATE_QUESTION", "An identical question already exists.");
    }

    const question = await prisma.question.update({
      where: { id: questionId },
      data: {
        type: data.type,
        questionText: data.questionText,
        options,
        correctOption,
        explanation: data.explanation ?? null,
        difficulty: data.difficulty,
        topicId: data.topicId ?? null,
        contentHash,
        ...(existing.status === "APPROVED"
          ? { status: "PENDING_REVIEW", reviewedById: null, reviewedAt: null }
          : {}),
      },
      select: {
        id: true,
        type: true,
        questionText: true,
        options: true,
        correctOption: true,
        explanation: true,
        difficulty: true,
        status: true,
        updatedAt: true,
      },
    });

    await safeRecordAudit({
      actorId: user.id,
      action: "QUESTION_UPDATED",
      entityType: "Question",
      entityId: String(questionId),
      metadata: { subjectId: existing.subjectId, requiresReview: existing.status === "APPROVED" },
    });

    return ok(question);
  });
}

export async function DELETE(
  request: Request,
  { params }: { params: { questionId: string } },
) {
  return withApi(async () => {
    const questionId = Number((await params).questionId);
    const existing = await loadQuestion(questionId);
    const { user } = await requireSubjectManage(existing.subjectId);
    const permanent = new URL(request.url).searchParams.get("permanent") === "true";

    if (permanent) {
      const examUsage = await prisma.examQuestion.count({ where: { questionId } });
      if (examUsage > 0) {
        throw new ApiError(
          409,
          "QUESTION_IN_USE",
          "This question is used in an exam. Archive it instead of deleting it.",
        );
      }

      await prisma.question.delete({ where: { id: questionId } });

      await safeRecordAudit({
        actorId: user.id,
        action: "QUESTION_DELETED",
        entityType: "Question",
        entityId: String(questionId),
        metadata: { subjectId: existing.subjectId },
      });

      return noContent();
    }

    await prisma.question.update({
      where: { id: questionId },
      data: { status: "ARCHIVED", reviewedById: user.id, reviewedAt: new Date() },
    });

    await safeRecordAudit({
      actorId: user.id,
      action: "QUESTION_ARCHIVED",
      entityType: "Question",
      entityId: String(questionId),
      metadata: { subjectId: existing.subjectId },
    });

    return noContent();
  });
}
