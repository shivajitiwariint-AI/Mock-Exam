import { noContent, ok } from "@/lib/api";
import { requireSubjectManage } from "@/lib/authz";
import { prisma } from "@/lib/db";
import { safeRecordAudit } from "@/lib/audit";
import { ApiError, withApi } from "@/lib/errors";
import { deletePrivateObject, getSignedDownloadUrl } from "@/lib/storage";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

async function loadDocument(documentId: string) {
  const document = await prisma.document.findUnique({
    where: { id: documentId },
    select: {
      id: true,
      subjectId: true,
      originalFilename: true,
      storageKey: true,
      status: true,
    },
  });
  if (!document) throw new ApiError(404, "NOT_FOUND", "Document not found.");
  return document;
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ documentId: string }> },
) {
  return withApi(async () => {
    const { documentId } = await params;
    const summary = await loadDocument(documentId);
    await requireSubjectManage(summary.subjectId);

    const document = await prisma.document.findUnique({
      where: { id: documentId },
      select: {
        id: true,
        subjectId: true,
        originalFilename: true,
        mimeType: true,
        sizeBytes: true,
        status: true,
        errorMessage: true,
        pageCount: true,
        chunkCount: true,
        processedAt: true,
        createdAt: true,
        uploader: { select: { id: true, name: true, email: true } },
      },
    });
    if (!document) throw new ApiError(404, "NOT_FOUND", "Document not found.");

    return ok({
      ...document,
      downloadUrl: await getSignedDownloadUrl(summary.storageKey, 300),
    });
  });
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ documentId: string }> },
) {
  return withApi(async () => {
    const { documentId } = await params;
    const document = await loadDocument(documentId);
    const { user } = await requireSubjectManage(document.subjectId);

    await prisma.document.delete({ where: { id: documentId } });
    await deletePrivateObject(document.storageKey);

    await safeRecordAudit({
      actorId: user.id,
      action: "DOCUMENT_DELETED",
      entityType: "Document",
      entityId: documentId,
      metadata: { subjectId: document.subjectId, filename: document.originalFilename },
    });

    return noContent();
  });
}
