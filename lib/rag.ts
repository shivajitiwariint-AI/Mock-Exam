import type { Prisma } from "@/app/generated/prisma/client";
import { embedQuery } from "./embeddings";
import { prisma } from "./db";

export type RetrievedChunk = {
  id: number;
  documentId: number;
  filename: string;
  chunkIndex: number;
  content: string;
  distance: number;
  score: number;
};

const MAX_CANDIDATES = 300;

function parseEmbedding(value: Prisma.JsonValue): number[] | null {
  let raw: unknown = value;
  if (typeof raw === "string") {
    try {
      raw = JSON.parse(raw);
    } catch {
      return null;
    }
  }
  if (!Array.isArray(raw) || raw.length === 0) return null;
  if (!raw.every((entry) => typeof entry === "number" && Number.isFinite(entry))) return null;
  return raw as number[];
}

function cosineSimilarity(a: number[], b: number[]): number {
  const length = Math.min(a.length, b.length);
  let dot = 0;
  let normA = 0;
  let normB = 0;

  for (let index = 0; index < length; index += 1) {
    dot += a[index] * b[index];
    normA += a[index] * a[index];
    normB += b[index] * b[index];
  }

  if (normA === 0 || normB === 0) return 0;
  return dot / (Math.sqrt(normA) * Math.sqrt(normB));
}

/**
 * Retrieves chunks for a single subject, ranked by cosine similarity against
 * the stored chunk embeddings. Callers MUST verify subject access server-side
 * before invoking this function; the access-control filter is applied to the
 * database query, not to client-supplied metadata.
 */
export async function retrieveChunks(
  subjectId: number,
  query: string,
  limit = 6,
  documentId?: number,
): Promise<RetrievedChunk[]> {
  const queryEmbedding = await embedQuery(query);
  const safeLimit = Math.min(Math.max(limit, 1), 12);

  const rows = await prisma.documentChunk.findMany({
    where: {
      subjectId,
      ...(documentId ? { documentId } : {}),
      document: { status: "PROCESSED" },
    },
    orderBy: { createdAt: "desc" },
    take: MAX_CANDIDATES,
    select: {
      id: true,
      documentId: true,
      chunkIndex: true,
      content: true,
      embedding: true,
      document: { select: { originalFilename: true } },
    },
  });

  return rows
    .map((row) => {
      const embedding = parseEmbedding(row.embedding);
      const score = embedding ? cosineSimilarity(queryEmbedding, embedding) : 0;
      return {
        id: row.id,
        documentId: row.documentId,
        filename: row.document.originalFilename,
        chunkIndex: row.chunkIndex,
        content: row.content,
        distance: embedding ? 1 - score : 1,
        score,
      };
    })
    .sort((a, b) => b.score - a.score)
    .slice(0, safeLimit);
}
