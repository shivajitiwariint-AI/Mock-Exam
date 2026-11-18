import { created } from "@/lib/api";
import { requireStudent } from "@/lib/authz";
import { safeRecordAudit } from "@/lib/audit";
import { withApi } from "@/lib/errors";
import { startInterviewSession } from "@/lib/interviews";
import { enforceRateLimit } from "@/lib/rate-limit";

export const runtime = "nodejs";

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ prepId: string }> },
) {
  return withApi(async () => {
    const user = await requireStudent();
    const { prepId } = await params;
    await enforceRateLimit(`interview-start:${user.id}`, 30, 60 * 60 * 1000);

    const session = await startInterviewSession(prepId, user.id);

    await safeRecordAudit({
      actorId: user.id,
      action: "INTERVIEW_SESSION_STARTED",
      entityType: "InterviewSession",
      entityId: session.sessionId,
      metadata: { prepId },
    });

    return created(session);
  });
}
