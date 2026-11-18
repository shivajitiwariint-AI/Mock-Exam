import { after } from "next/server";
import { accepted, parseJson } from "@/lib/api";
import { requireSubjectManage } from "@/lib/authz";
import { prisma } from "@/lib/db";
import { safeRecordAudit } from "@/lib/audit";
import { ApiError, withApi } from "@/lib/errors";
import { drainJobById, enqueueJob } from "@/lib/jobs";
import { llmConfigured } from "@/lib/llm";
import { generateQuestionsSchema } from "@/lib/validation";

export const runtime = "nodejs";
export const maxDuration = 300;

export async function POST(
  request: Request,
  { params }: { params: Promise<{ subjectId: string }> },
) {
  return withApi(async () => {
    const { subjectId } = await params;
    const { user } = await requireSubjectManage(subjectId);
    const data = await parseJson(request, generateQuestionsSchema);

    if (!llmConfigured()) {
      throw new ApiError(
        503,
        "AI_NOT_CONFIGURED",
        "Question generation requires a configured AI provider.",
      );
    }

    if (data.topicId) {
      const topic = await prisma.topic.findFirst({
        where: { id: data.topicId, subjectId },
        select: { id: true },
      });
      if (!topic) {
        throw new ApiError(400, "INVALID_TOPIC", "Topic does not belong to this subject.");
      }
    }

    const job = await enqueueJob("QUESTION_GENERATION", {
      subjectId,
      topicId: data.topicId ?? null,
      count: data.count,
      difficulty: data.difficulty,
      instructions: data.instructions ?? null,
      requestedById: user.id,
    });

    after(async () => {
      try {
        await drainJobById(job.id, 180_000);
      } catch (error) {
        console.error("[questions] generation failed", {
          jobId: job.id,
          message: error instanceof Error ? error.message : "unknown",
        });
      }
    });

    await safeRecordAudit({
      actorId: user.id,
      action: "QUESTION_GENERATION_ENQUEUED",
      entityType: "Subject",
      entityId: subjectId,
      metadata: { jobId: job.id, count: data.count, difficulty: data.difficulty },
    });

    return accepted({ job });
  });
}
