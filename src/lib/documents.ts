import { randomUUID } from "node:crypto";
import { prisma } from "./db";
import { chunkText } from "./chunking";
import { embedTexts } from "./embeddings";
import { extractDocumentText, getExtension, isSupportedExtension } from "./extraction";
import { safeRecordAudit } from "./audit";
import { ApiError } from "./errors";
import { getPrivateObject } from "./storage";

export type DocumentProcessingResult = {
  documentId: string;
  chunkCount: number;
  pageCount?: number;
};

export async function processDocument(documentId: string): Promise<DocumentProcessingResult> {
  const document = await prisma.document.findUnique({ where: { id: documentId } });
  if (!document) {
    throw new ApiError(404, "NOT_FOUND", "Document not found.");
  }

  await prisma.document.update({
    where: { id: document.id },
    data: { 
      status: "PROCESSING", 
      processingMessage: "Extracting text from document...",
      errorMessage: null 
    },
  });

  try {
    const extension = getExtension(document.originalFilename);
    if (!isSupportedExtension(extension)) {
      throw new ApiError(422, "UNSUPPORTED_FILE", "This document type is not supported.");
    }

    const buffer = await getPrivateObject(document.storageKey);
    
    await prisma.document.update({
      where: { id: document.id },
      data: { processingMessage: "Splitting text into chunks..." },
    });

    const extracted = await extractDocumentText(buffer, extension);
    const chunks = chunkText(extracted.text);

    if (!chunks.length) {
      throw new ApiError(422, "EMPTY_DOCUMENT", "No readable text was found in the document.");
    }

    const chunkIds = chunks.map(() => randomUUID());

    await prisma.$transaction(async (tx) => {
      await tx.documentChunk.deleteMany({ where: { documentId: document.id } });
      await tx.documentChunk.createMany({
        data: chunks.map((chunk, index) => ({
          id: chunkIds[index],
          documentId: document.id,
          subjectId: document.subjectId,
          chunkIndex: chunk.index,
          content: chunk.content,
          charCount: chunk.charCount,
        })),
      });
    });

    await prisma.document.update({
      where: { id: document.id },
      data: { processingMessage: "Generating AI embeddings..." },
    });

    const embeddings = await embedTexts(chunks.map((chunk) => chunk.content));

    for (let index = 0; index < chunkIds.length; index += 1) {
      const vector = JSON.stringify(embeddings[index]);
      await prisma.documentChunk.update({
        where: { id: chunkIds[index] },
        data: { embedding: vector },
      });

      const progress = Math.round(((index + 1) / chunkIds.length) * 100);
      await prisma.document.update({
        where: { id: document.id },
        data: { processingMessage: `Processing embeddings: ${progress}%...` },
      });
    }

    await prisma.document.update({
      where: { id: document.id },
      data: {
        status: "PROCESSED",
        processingMessage: "Document processed successfully!",
        chunkCount: chunks.length,
        pageCount: extracted.pageCount ?? null,
        processedAt: new Date(),
        errorMessage: null,
      },
    });

    await safeRecordAudit({
      action: "DOCUMENT_PROCESSED",
      entityType: "Document",
      entityId: document.id,
      metadata: { chunkCount: chunks.length, subjectId: document.subjectId },
    });

    return {
      documentId: document.id,
      chunkCount: chunks.length,
      pageCount: extracted.pageCount,
    };
  } catch (error) {
    const message =
      error instanceof Error ? error.message.slice(0, 1000) : "Document processing failed.";
    await prisma.document.update({
      where: { id: document.id },
      data: { status: "FAILED", errorMessage: message },
    });
    throw error;
  }
}
