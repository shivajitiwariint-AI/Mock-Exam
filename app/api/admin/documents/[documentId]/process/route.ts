import { after } from "@/lib/after";
import { accepted } from "@/lib/api";
import { requireSubjectManage } from "@/lib/authz";
import { prisma } from "@/lib/db";
import { safeRecordAudit } from "@/lib/audit";
import { ApiError, withApi } from "@/lib/errors";
import { drainJobById, enqueueJob } from "@/lib/jobs";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 300;

export async function POST(
  _request: Request,
  { params }: { params: { documentId: string } },
) {
  return withApi(async () => {
    const documentId = Number((await params).documentId);
    const document = await prisma.document.findUnique({
      where: { id: documentId },
      select: { id: true, subjectId: true, status: true },
    });
    if (!document) throw new ApiError(404, "NOT_FOUND", "Document not found.");
    const { user } = await requireSubjectManage(document.subjectId);

    if (document.status === "PROCESSING") {
      throw new ApiError(409, "ALREADY_PROCESSING", "This document is already being processed.");
    }

    const updated = await prisma.document.update({
      where: { id: documentId },
      data: { status: "UPLOADED", errorMessage: null },
      select: { id: true, status: true },
    });

    const job = await enqueueJob("DOCUMENT_PROCESSING", { documentId });

    after(async () => {
      try {
        await drainJobById(job.id, 180_000);
      } catch (error) {
        console.error("[documents] reprocessing failed", {
          documentId,
          message: error instanceof Error ? error.message : "unknown",
        });
      }
    });

    await safeRecordAudit({
      actorId: user.id,
      action: "DOCUMENT_REPROCESS_REQUESTED",
      entityType: "Document",
      entityId: String(documentId),
      metadata: { subjectId: document.subjectId, jobId: job.id },
    });

    return accepted({ document: updated, job });
  });
}
