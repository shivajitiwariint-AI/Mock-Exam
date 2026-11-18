import { randomUUID } from "node:crypto";
import type { DocumentStatus } from "@prisma/client";
import { after } from "next/server";
import { accepted, ok, paginated, parsePagination } from "@/lib/api";
import { requireSubjectManage } from "@/lib/authz";
import { prisma } from "@/lib/db";
import { safeRecordAudit } from "@/lib/audit";
import { contentChecksum } from "@/lib/embeddings";
import { maxUploadBytes } from "@/lib/env";
import { ApiError, withApi } from "@/lib/errors";
import {
  getExtension,
  isSupportedExtension,
  SUPPORTED_DOCUMENT_TYPES,
} from "@/lib/extraction";
import { drainJobById, enqueueJob } from "@/lib/jobs";
import { enforceRateLimit } from "@/lib/rate-limit";
import { deletePrivateObject, putPrivateObject } from "@/lib/storage";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 300; // Increased to 5 minutes for large documents

export async function GET(
  request: Request,
  { params }: { params: Promise<{ subjectId: string }> },
) {
  return withApi(async () => {
    const { subjectId } = await params;
    await requireSubjectManage(subjectId);
    const url = new URL(request.url);
    const { page, pageSize, skip, take } = parsePagination(url);
    const statusParam = url.searchParams.get("status");
    const status: DocumentStatus | undefined =
      statusParam === "UPLOADED" ||
      statusParam === "PROCESSING" ||
      statusParam === "PROCESSED" ||
      statusParam === "FAILED"
        ? statusParam
        : undefined;

    const where = { subjectId, ...(status ? { status } : {}) };
    const [total, documents] = await Promise.all([
      prisma.document.count({ where }),
      prisma.document.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip,
        take,
        select: {
          id: true,
          originalFilename: true,
          mimeType: true,
          sizeBytes: true,
          status: true,
          processingMessage: true,
          errorMessage: true,
          pageCount: true,
          chunkCount: true,
          processedAt: true,
          topic: { select: { id: true, name: true } },
          questionGenerationStatus: true,
          questionGenerationProgress: true,
          questionGenerationMessage: true,
          generatedQuestionCount: true,
          questionGenerationCompletedAt: true,
          createdAt: true,
          uploader: { select: { id: true, name: true, email: true } },
        },
      }),
    ]);

    return ok(paginated(documents, total, page, pageSize));
  });
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ subjectId: string }> },
) {
  return withApi(async () => {
    const { subjectId } = await params;
    const { user } = await requireSubjectManage(subjectId);
    await enforceRateLimit(`upload:${user.id}`, 20, 60 * 60 * 1000);

    let form: FormData;
    try {
      form = await request.formData();
    } catch {
      throw new ApiError(400, "INVALID_FORM", "Expected a multipart form upload.");
    }

    const file = form.get("file");
    if (!(file instanceof File)) {
      throw new ApiError(400, "FILE_REQUIRED", "A file field is required.");
    }

    const limit = maxUploadBytes();
    if (file.size === 0) {
      throw new ApiError(400, "EMPTY_FILE", "The uploaded file is empty.");
    }
    if (file.size > limit) {
      throw new ApiError(
        413,
        "FILE_TOO_LARGE",
        `The file exceeds the ${Math.round(limit / (1024 * 1024))}MB upload limit.`,
      );
    }

    const extension = getExtension(file.name);
    if (!isSupportedExtension(extension)) {
      throw new ApiError(
        422,
        "UNSUPPORTED_FILE",
        "Only PDF, DOCX, and TXT files are supported.",
      );
    }

    const topicValue = form.get("topicId");
    const topicId = typeof topicValue === "string" && topicValue.trim() ? topicValue.trim() : null;
    if (topicId) {
      const topic = await prisma.topic.findFirst({
        where: { id: topicId, subjectId },
        select: { id: true },
      });
      if (!topic) {
        throw new ApiError(400, "INVALID_TOPIC", "Topic does not belong to this subject.");
      }
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const checksum = contentChecksum(buffer);
    const storageKey = `subjects/${subjectId}/documents/${randomUUID()}.${extension}`;

    await putPrivateObject(storageKey, buffer, SUPPORTED_DOCUMENT_TYPES[extension]);

    let document;
    try {
      document = await prisma.document.create({
        data: {
          subjectId,
          topicId,
          uploaderId: user.id,
          originalFilename: file.name.slice(0, 255),
          storageKey,
          mimeType: SUPPORTED_DOCUMENT_TYPES[extension],
          sizeBytes: buffer.byteLength,
          checksum,
          status: "UPLOADED",
        },
        select: {
          id: true,
          originalFilename: true,
          status: true,
          sizeBytes: true,
          createdAt: true,
        },
      });
    } catch (error) {
      await deletePrivateObject(storageKey);
      throw error;
    }

    const job = await enqueueJob("DOCUMENT_PROCESSING", { documentId: document.id });

    after(async () => {
      try {
        await drainJobById(job.id, 180_000);
      } catch (error) {
        console.error("[upload] background processing failed", {
          documentId: document.id,
          message: error instanceof Error ? error.message : "unknown",
        });
      }
    });

    await safeRecordAudit({
      actorId: user.id,
      action: "DOCUMENT_UPLOADED",
      entityType: "Document",
      entityId: document.id,
      metadata: { subjectId, filename: document.originalFilename, sizeBytes: buffer.byteLength },
    });

    return accepted({ document, job });
  });
}
