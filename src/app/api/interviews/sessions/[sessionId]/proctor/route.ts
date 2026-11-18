import type { Prisma } from "@prisma/client";
import { ok, parseJson } from "@/lib/api";
import { requireStudent } from "@/lib/authz";
import { prisma } from "@/lib/db";
import { ApiError, withApi } from "@/lib/errors";
import { enforceRateLimit } from "@/lib/rate-limit";
import { proctorEventSchema } from "@/lib/validation";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const FLAGGED_TYPES = new Set([
  "SCREEN_SHARE_STOPPED",
  "CAMERA_STOPPED",
  "TAB_HIDDEN",
  "WINDOW_BLURRED",
  "FULLSCREEN_EXITED",
]);

export async function POST(
  request: Request,
  { params }: { params: Promise<{ sessionId: string }> },
) {
  return withApi(async () => {
    const user = await requireStudent();
    const { sessionId } = await params;
    await enforceRateLimit(`interview-proctor:${user.id}`, 120, 60 * 1000);

    const session = await prisma.interviewSession.findFirst({
      where: { id: sessionId, userId: user.id },
      select: { id: true, prepId: true, status: true },
    });
    if (!session) throw new ApiError(404, "NOT_FOUND", "Interview session not found.");
    if (session.status !== "IN_PROGRESS") {
      throw new ApiError(409, "SESSION_COMPLETED", "This interview session is already complete.");
    }

    const data = await parseJson(request, proctorEventSchema);
    const flagged = FLAGGED_TYPES.has(data.type);

    await prisma.$transaction([
      prisma.interviewProctorEvent.create({
        data: {
          sessionId: session.id,
          prepId: session.prepId,
          userId: user.id,
          type: data.type,
          flagged,
          occurredAt: data.occurredAt ?? new Date(),
          metadata: data.metadata as Prisma.InputJsonValue | undefined,
        },
      }),
      prisma.interviewPrep.update({
        where: { id: session.prepId },
        data: {
          proctorEventCount: { increment: 1 },
          ...(flagged ? { proctorFlagCount: { increment: 1 } } : {}),
        },
      }),
    ]);

    return ok({ recorded: true });
  });
}
