import { noContent } from "@/lib/api";
import { safeRecordAudit } from "@/lib/audit";
import { requireRole } from "@/lib/authz";
import { prisma } from "@/lib/db";
import { ApiError, withApi } from "@/lib/errors";
import { deletePrivateObject } from "@/lib/storage";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ prepId: string }> },
) {
  return withApi(async () => {
    const user = await requireRole("SUPER_ADMIN", "SUBJECT_ADMIN");
    const { prepId } = await params;

    const prep = await prisma.interviewPrep.findUnique({
      where: { id: prepId },
      select: {
        id: true,
        userId: true,
        title: true,
        company: true,
        resumeStorageKey: true,
        jdStorageKey: true,
        actualQuestionsStorageKey: true,
        _count: { select: { questions: true, sessions: true } },
      },
    });
    if (!prep) throw new ApiError(404, "NOT_FOUND", "Interview kit not found.");
    if (user.role !== "SUPER_ADMIN" && prep.userId !== user.id) {
      throw new ApiError(404, "NOT_FOUND", "Interview kit not found.");
    }

    await prisma.interviewPrep.delete({ where: { id: prep.id } });
    await Promise.all([
      prep.resumeStorageKey
        ? deletePrivateObject(prep.resumeStorageKey).catch(() => undefined)
        : Promise.resolve(),
      prep.jdStorageKey
        ? deletePrivateObject(prep.jdStorageKey).catch(() => undefined)
        : Promise.resolve(),
      prep.actualQuestionsStorageKey
        ? deletePrivateObject(prep.actualQuestionsStorageKey).catch(() => undefined)
        : Promise.resolve(),
    ]);

    await safeRecordAudit({
      actorId: user.id,
      action: "INTERVIEW_KIT_DELETED",
      entityType: "InterviewPrep",
      entityId: prep.id,
      metadata: {
        title: prep.title,
        company: prep.company,
        questionCount: prep._count.questions,
        sessionCount: prep._count.sessions,
        ownerId: prep.userId,
      },
    });

    return noContent();
  });
}
