import { ok } from "@/lib/api";
import { requireSubjectManage } from "@/lib/authz";
import { prisma } from "@/lib/db";
import { safeRecordAudit } from "@/lib/audit";
import { ApiError, withApi } from "@/lib/errors";

export const runtime = "nodejs";

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ questionId: string }> },
) {
  return withApi(async () => {
    const { questionId } = await params;
    const question = await prisma.question.findUnique({
      where: { id: questionId },
      select: { id: true, subjectId: true, status: true },
    });
    if (!question) throw new ApiError(404, "NOT_FOUND", "Question not found.");
    const { user } = await requireSubjectManage(question.subjectId);

    if (question.status === "ARCHIVED") {
      throw new ApiError(409, "QUESTION_ARCHIVED", "Archived questions cannot be approved.");
    }

    const updated = await prisma.question.update({
      where: { id: questionId },
      data: { status: "APPROVED", reviewedById: user.id, reviewedAt: new Date() },
      select: { id: true, status: true, reviewedAt: true },
    });

    await safeRecordAudit({
      actorId: user.id,
      action: "QUESTION_APPROVED",
      entityType: "Question",
      entityId: questionId,
      metadata: { subjectId: question.subjectId },
    });

    return ok(updated);
  });
}
