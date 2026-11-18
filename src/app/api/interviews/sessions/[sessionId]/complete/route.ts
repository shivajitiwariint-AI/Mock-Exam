import { ok } from "@/lib/api";
import { requireStudent } from "@/lib/authz";
import { safeRecordAudit } from "@/lib/audit";
import { ApiError, withApi } from "@/lib/errors";
import { completeInterviewSession } from "@/lib/interviews";
import { llmConfigured } from "@/lib/llm";
import { enforceRateLimit } from "@/lib/rate-limit";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ sessionId: string }> },
) {
  return withApi(async () => {
    const user = await requireStudent();
    const { sessionId } = await params;

    await enforceRateLimit(`interview-complete:${user.id}`, 20, 60 * 60 * 1000);

    if (!llmConfigured()) {
      throw new ApiError(
        503,
        "AI_NOT_CONFIGURED",
        "Interview feedback requires a configured AI provider.",
      );
    }

    const view = await completeInterviewSession(sessionId, user.id);

    await safeRecordAudit({
      actorId: user.id,
      action: "INTERVIEW_SESSION_COMPLETED",
      entityType: "InterviewSession",
      entityId: sessionId,
    });

    return ok(view);
  });
}
