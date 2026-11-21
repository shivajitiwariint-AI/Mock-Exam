import { noContent, ok, parseJson } from "@/lib/api";
import { requireSuperAdmin } from "@/lib/authz";
import { prisma } from "@/lib/db";
import { safeRecordAudit } from "@/lib/audit";
import { ApiError, withApi } from "@/lib/errors";
import { deletePrivateObject } from "@/lib/storage";
import { updateUserSchema } from "@/lib/validation";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

async function loadUser(userId: number) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      email: true,
      name: true,
      role: true,
      status: true,
      lastLoginAt: true,
      createdAt: true,
      subjectAssignments: {
        select: { subject: { select: { id: true, name: true } } },
      },
    },
  });
  if (!user) throw new ApiError(404, "NOT_FOUND", "User not found.");
  return user;
}

export async function GET(
  _request: Request,
  { params }: { params: { userId: string } },
) {
  return withApi(async () => {
    await requireSuperAdmin();
    const userId = Number((await params).userId);
    const user = await loadUser(userId);
    return ok({
      ...user,
      subjects: user.subjectAssignments.map((assignment) => assignment.subject),
    });
  });
}

export async function PATCH(
  request: Request,
  { params }: { params: { userId: string } },
) {
  return withApi(async () => {
    const actor = await requireSuperAdmin();
    const userId = Number((await params).userId);
    const data = await parseJson(request, updateUserSchema);
    const target = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, role: true, status: true },
    });
    if (!target) throw new ApiError(404, "NOT_FOUND", "User not found.");

    if (target.id === actor.id && (data.role || data.status)) {
      throw new ApiError(400, "SELF_CHANGE", "You cannot change your own role or status.");
    }

    if (target.role === "SUPER_ADMIN" && (data.role !== undefined || data.status !== undefined)) {
      const activeSuperAdmins = await prisma.user.count({
        where: { role: "SUPER_ADMIN", status: "ACTIVE" },
      });
      const removesAccess =
        (data.role !== undefined && data.role !== "SUPER_ADMIN") ||
        (data.status !== undefined && data.status !== "ACTIVE");
      if (removesAccess && activeSuperAdmins <= 1) {
        throw new ApiError(409, "LAST_SUPER_ADMIN", "At least one active super admin is required.");
      }
    }

    const updated = await prisma.$transaction(async (tx) => {
      const user = await tx.user.update({
        where: { id: userId },
        data,
        select: { id: true, email: true, name: true, role: true, status: true },
      });
      if (data.role && data.role !== "SUBJECT_ADMIN") {
        await tx.subjectAdmin.deleteMany({ where: { userId } });
      }
      return user;
    });

    await safeRecordAudit({
      actorId: actor.id,
      action: "USER_UPDATED",
      entityType: "User",
      entityId: String(userId),
      metadata: { changes: data },
    });

    return ok(updated);
  });
}

export async function DELETE(
  _request: Request,
  { params }: { params: { userId: string } },
) {
  return withApi(async () => {
    const actor = await requireSuperAdmin();
    const userId = Number((await params).userId);

    const target = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, email: true, role: true, status: true },
    });
    if (!target) throw new ApiError(404, "NOT_FOUND", "User not found.");
    if (target.id === actor.id) {
      throw new ApiError(400, "SELF_DELETE", "You cannot delete your own account.");
    }
    if (target.role === "SUPER_ADMIN") {
      const activeSuperAdmins = await prisma.user.count({
        where: { role: "SUPER_ADMIN", status: "ACTIVE" },
      });
      if (activeSuperAdmins <= 1) {
        throw new ApiError(409, "LAST_SUPER_ADMIN", "At least one active super admin is required.");
      }
    }

    const [documents, preps] = await Promise.all([
      prisma.document.findMany({
        where: { uploaderId: userId },
        select: { storageKey: true },
      }),
      prisma.interviewPrep.findMany({
        where: { userId },
        select: {
          resumeStorageKey: true,
          jdStorageKey: true,
          actualQuestionsStorageKey: true,
        },
      }),
    ]);

    await prisma.$transaction(
      async (tx) => {
        const exams = await tx.exam.findMany({
          where: { userId: userId },
          select: { id: true },
        });
        const examIds = exams.map((exam) => exam.id);
        if (examIds.length) {
          await tx.examAttempt.deleteMany({ where: { examId: { in: examIds } } });
          await tx.examQuestion.deleteMany({ where: { examId: { in: examIds } } });
          await tx.exam.deleteMany({ where: { id: { in: examIds } } });
        }

        await tx.examAttempt.deleteMany({ where: { studentId: userId } });

        const questions = await tx.question.findMany({
          where: { userId: userId },
          select: { id: true },
        });
        const questionIds = questions.map((question) => question.id);
        if (questionIds.length) {
          await tx.examQuestion.deleteMany({ where: { questionId: { in: questionIds } } });
          await tx.question.deleteMany({ where: { id: { in: questionIds } } });
        }

        await tx.document.deleteMany({ where: { uploaderId: userId } });
        await tx.user.delete({ where: { id: userId } });
      },
      { timeout: 30_000 },
    );

    await Promise.all([
      ...documents.map((document) =>
        deletePrivateObject(document.storageKey).catch(() => undefined),
      ),
      ...preps.flatMap((prep) => [
        prep.resumeStorageKey
          ? deletePrivateObject(prep.resumeStorageKey).catch(() => undefined)
          : Promise.resolve(),
        prep.jdStorageKey
          ? deletePrivateObject(prep.jdStorageKey).catch(() => undefined)
          : Promise.resolve(),
        prep.actualQuestionsStorageKey
          ? deletePrivateObject(prep.actualQuestionsStorageKey).catch(() => undefined)
          : Promise.resolve(),
      ]),
    ]);

    await safeRecordAudit({
      actorId: actor.id,
      action: "USER_DELETED",
      entityType: "User",
      entityId: String(userId),
      metadata: { email: target.email, role: target.role },
    });

    return noContent();
  });
}
