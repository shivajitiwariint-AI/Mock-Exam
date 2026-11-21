import { noContent, ok, parseJson } from "@/lib/api";
import { requireSubjectManage, requireSuperAdmin } from "@/lib/authz";
import { prisma } from "@/lib/db";
import { safeRecordAudit } from "@/lib/audit";
import { ApiError, withApi } from "@/lib/errors";
import { deletePrivateObject } from "@/lib/storage";
import { updateSubjectSchema } from "@/lib/validation";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(
  _request: Request,
  { params }: { params: { subjectId: string } },
) {
  return withApi(async () => {
    const subjectId = Number((await params).subjectId);
    await requireSubjectManage(subjectId);
    const subject = await prisma.subject.findUnique({
      where: { id: subjectId },
      select: {
        id: true,
        name: true,
        slug: true,
        description: true,
        status: true,
        createdAt: true,
        updatedAt: true,
        topics: { orderBy: { name: "asc" } },
        admins: {
          include: { user: { select: { id: true, name: true, email: true, status: true } } },
        },
        _count: { select: { documents: true, questions: true, exams: true } },
      },
    });
    if (!subject) throw new ApiError(404, "NOT_FOUND", "Subject not found.");
    return ok({
      ...subject,
      admins: subject.admins.map((admin) => admin.user),
      documentCount: subject._count.documents,
      questionCount: subject._count.questions,
      examCount: subject._count.exams,
    });
  });
}

export async function PATCH(
  request: Request,
  { params }: { params: { subjectId: string } },
) {
  return withApi(async () => {
    const subjectId = Number((await params).subjectId);
    const { user } = await requireSubjectManage(subjectId);
    const data = await parseJson(request, updateSubjectSchema);

    if (data.status && user.role !== "SUPER_ADMIN") {
      throw new ApiError(403, "FORBIDDEN", "Only super admins can change subject status.");
    }

    const subject = await prisma.subject.update({
      where: { id: subjectId },
      data,
      select: { id: true, name: true, slug: true, description: true, status: true },
    });

    return ok(subject);
  });
}

export async function DELETE(
  _request: Request,
  { params }: { params: { subjectId: string } },
) {
  return withApi(async () => {
    const actor = await requireSuperAdmin();
    const subjectId = Number((await params).subjectId);

    const subject = await prisma.subject.findUnique({
      where: { id: subjectId },
      select: { id: true, name: true, slug: true },
    });
    if (!subject) throw new ApiError(404, "NOT_FOUND", "Subject not found.");

    const documents = await prisma.document.findMany({
      where: { subjectId },
      select: { storageKey: true },
    });

    await prisma.$transaction(
      async (tx) => {
        const exams = await tx.exam.findMany({
          where: { subjectId },
          select: { id: true },
        });
        const examIds = exams.map((exam) => exam.id);
        if (examIds.length) {
          await tx.examAttempt.deleteMany({ where: { examId: { in: examIds } } });
          await tx.examQuestion.deleteMany({ where: { examId: { in: examIds } } });
          await tx.exam.deleteMany({ where: { id: { in: examIds } } });
        }

        const questions = await tx.question.findMany({
          where: { subjectId },
          select: { id: true },
        });
        const questionIds = questions.map((question) => question.id);
        if (questionIds.length) {
          await tx.examQuestion.deleteMany({ where: { questionId: { in: questionIds } } });
          await tx.question.deleteMany({ where: { id: { in: questionIds } } });
        }

        await tx.document.deleteMany({ where: { subjectId } });
        await tx.topic.deleteMany({ where: { subjectId } });
        await tx.subjectAdmin.deleteMany({ where: { subjectId } });
        await tx.subject.delete({ where: { id: subjectId } });
      },
      { timeout: 30_000 },
    );

    await Promise.all(
      documents.map((document) =>
        deletePrivateObject(document.storageKey).catch(() => undefined),
      ),
    );

    await safeRecordAudit({
      actorId: actor.id,
      action: "SUBJECT_DELETED",
      entityType: "Subject",
      entityId: String(subjectId),
      metadata: { name: subject.name, slug: subject.slug },
    });

    return noContent();
  });
}
