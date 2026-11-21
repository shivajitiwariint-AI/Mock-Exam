import { ok } from "@/lib/api";
import { requireSubjectManage } from "@/lib/authz";
import { prisma } from "@/lib/db";
import { ApiError, withApi } from "@/lib/errors";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(
  _request: Request,
  { params }: { params: { jobId: string } },
) {
  return withApi(async () => {
    const jobId = Number((await params).jobId);
    const job = await prisma.processingJob.findUnique({
      where: { id: jobId },
      select: {
        id: true,
        type: true,
        status: true,
        payload: true,
        attempts: true,
        maxAttempts: true,
        progress: true,
        progressMessage: true,
        lastError: true,
        createdAt: true,
        updatedAt: true,
      },
    });
    if (!job) throw new ApiError(404, "NOT_FOUND", "Job not found.");

    const payload = job.payload as { subjectId?: unknown; documentId?: unknown };
    let subjectId =
      typeof payload.subjectId === "number" ? payload.subjectId : undefined;

    if (subjectId === undefined && typeof payload.documentId === "number") {
      const document = await prisma.document.findUnique({
        where: { id: payload.documentId },
        select: { subjectId: true },
      });
      subjectId = document?.subjectId;
    }

    if (!subjectId) throw new ApiError(404, "NOT_FOUND", "Job not found.");
    await requireSubjectManage(subjectId);

    return ok({
      id: job.id,
      type: job.type,
      status: job.status,
      attempts: job.attempts,
      maxAttempts: job.maxAttempts,
      progress: job.progress,
      progressMessage: job.progressMessage,
      lastError: job.lastError,
      createdAt: job.createdAt,
      updatedAt: job.updatedAt,
    });
  });
}
