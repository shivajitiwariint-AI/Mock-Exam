import { noContent } from "@/lib/api";
import { requireSuperAdmin } from "@/lib/authz";
import { prisma } from "@/lib/db";
import { safeRecordAudit } from "@/lib/audit";
import { ApiError, withApi } from "@/lib/errors";

export const runtime = "nodejs";

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ subjectId: string; userId: string }> },
) {
  return withApi(async () => {
    const actor = await requireSuperAdmin();
    const { subjectId, userId } = await params;

    const deleted = await prisma.subjectAdmin.deleteMany({ where: { subjectId, userId } });
    if (deleted.count === 0) {
      throw new ApiError(404, "NOT_FOUND", "Assignment not found.");
    }

    await safeRecordAudit({
      actorId: actor.id,
      action: "SUBJECT_ADMIN_REMOVED",
      entityType: "Subject",
      entityId: subjectId,
      metadata: { userId },
    });

    return noContent();
  });
}
