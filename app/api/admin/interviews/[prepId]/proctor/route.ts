import { ok } from "@/lib/api";
import { requireRole } from "@/lib/authz";
import { prisma } from "@/lib/db";
import { ApiError, withApi } from "@/lib/errors";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(
  _request: Request,
  { params }: { params: { prepId: string } },
) {
  return withApi(async () => {
    const user = await requireRole("SUPER_ADMIN", "SUBJECT_ADMIN");
    const prepId = Number((await params).prepId);

    const prep = await prisma.interviewPrep.findUnique({
      where: { id: prepId },
      select: { id: true, userId: true, title: true, company: true },
    });
    if (!prep) throw new ApiError(404, "NOT_FOUND", "Interview kit not found.");
    if (user.role !== "SUPER_ADMIN" && prep.userId !== user.id) {
      throw new ApiError(404, "NOT_FOUND", "Interview kit not found.");
    }

    const events = await prisma.interviewProctorEvent.findMany({
      where: { prepId },
      orderBy: { occurredAt: "desc" },
      take: 100,
      select: {
        id: true,
        type: true,
        flagged: true,
        occurredAt: true,
        metadata: true,
        session: {
          select: {
            id: true,
            startedAt: true,
            completedAt: true,
          },
        },
      },
    });

    return ok({ prep, events });
  });
}
