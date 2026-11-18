import { after } from "next/server";
import { accepted } from "@/lib/api";
import { requireStudent } from "@/lib/authz";
import { safeRecordAudit } from "@/lib/audit";
import { prisma } from "@/lib/db";
import { ApiError, withApi } from "@/lib/errors";
import { drainJobById, enqueueJob } from "@/lib/jobs";
import { llmConfigured } from "@/lib/llm";
import { enforceRateLimit } from "@/lib/rate-limit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 300;

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ prepId: string }> },
) {
  return withApi(async () => {
    const user = await requireStudent();
    const { prepId } = await params;
    await enforceRateLimit(`interview-generate:${user.id}`, 20, 60 * 60 * 1000);

    if (!llmConfigured()) {
      throw new ApiError(
        503,
        "AI_NOT_CONFIGURED",
        "Interview generation requires a configured AI provider.",
      );
    }

    const prep = await prisma.interviewPrep.findFirst({
      where: { id: prepId, userId: user.id },
      select: { id: true, status: true, _count: { select: { sessions: true } } },
    });
    if (!prep) {
      throw new ApiError(404, "NOT_FOUND", "Interview preparation not found.");
    }
    if (prep._count.sessions > 0) {
      throw new ApiError(
        409,
        "INTERVIEW_ALREADY_USED",
        "This interview kit already has practice sessions, so its questions cannot be regenerated.",
      );
    }

    const claim = await prisma.interviewPrep.updateMany({
      where: { id: prep.id, status: { in: ["FAILED", "READY"] } },
      data: { status: "PROCESSING", errorMessage: null },
    });
    if (claim.count === 0) {
      throw new ApiError(
        409,
        "ALREADY_PROCESSING",
        "Questions are already being generated for this interview kit.",
      );
    }

    const generationJob = await enqueueJob(
      "QUESTION_GENERATION",
      { interviewPrepId: prep.id, requestedById: user.id },
      { maxAttempts: 3 },
    );

    after(async () => {
      try {
        await drainJobById(generationJob.id);
      } catch (error) {
        console.error("[interviews] retry generation drain failed", {
          prepId: prep.id,
          message: error instanceof Error ? error.message : "unknown",
        });
      }
    });

    await safeRecordAudit({
      actorId: user.id,
      action: "INTERVIEW_GENERATION_ENQUEUED",
      entityType: "InterviewPrep",
      entityId: prep.id,
    });

    return accepted({ prepId: prep.id, status: "PROCESSING" });
  });
}
