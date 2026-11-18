import { createHash } from "node:crypto";
import { optionalEnv } from "./env";
import { ApiError } from "./errors";

export const EMBEDDING_DIMENSIONS = 1536;
const MAX_BATCH_SIZE = 64;

type EmbeddingConfig = {
  apiKey: string;
  baseUrl: string;
  model: string;
};

/**
 * Groq does not expose an embeddings endpoint, so embeddings use a separate
 * OpenAI-compatible provider only when EMBEDDING_API_KEY + EMBEDDING_BASE_URL
 * are configured. Otherwise the deterministic hashing embeddings below are
 * used, which keeps local RAG working without a paid provider.
 */
export function embeddingConfig(): EmbeddingConfig | null {
  const apiKey = optionalEnv("EMBEDDING_API_KEY");
  const baseUrl = optionalEnv("EMBEDDING_BASE_URL");
  const model = optionalEnv("EMBEDDING_MODEL");
  if (!apiKey || !baseUrl || !model) return null;

  return {
    apiKey,
    baseUrl: baseUrl.replace(/\/$/, ""),
    model,
  };
}

export function embeddingsConfigured(): boolean {
  return embeddingConfig() !== null;
}

function fnv1a(value: string): number {
  let hash = 0x811c9dc5;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 0x01000193);
  }
  return hash >>> 0;
}

/**
 * Deterministic hashing embedding used when no embedding provider is
 * configured. It keeps retrieval functional for local demos without sending
 * data to a third party, but it is not semantically equivalent to a real
 * embedding model.
 */
export function deterministicEmbedding(text: string): number[] {
  const vector = new Array<number>(EMBEDDING_DIMENSIONS).fill(0);
  const tokens = text.toLowerCase().match(/[a-z0-9][a-z0-9'-]{0,40}/g) ?? [];

  for (let index = 0; index < tokens.length; index += 1) {
    const token = tokens[index];
    const weight = 1 / Math.sqrt(1 + token.length);
    vector[fnv1a(token) % EMBEDDING_DIMENSIONS] += weight;
    if (index + 1 < tokens.length) {
      vector[fnv1a(`${token} ${tokens[index + 1]}`) % EMBEDDING_DIMENSIONS] += weight * 0.5;
    }
  }

  let norm = 0;
  for (const value of vector) norm += value * value;
  norm = Math.sqrt(norm) || 1;
  return vector.map((value) => value / norm);
}

type EmbeddingResponse = {
  data?: { embedding?: unknown }[];
};

async function requestEmbeddings(inputs: string[]): Promise<number[][]> {
  const config = embeddingConfig();
  if (!config) {
    throw new ApiError(503, "EMBEDDINGS_NOT_CONFIGURED", "Embeddings are not configured.");
  }

  for (let attempt = 0; attempt < 3; attempt += 1) {
    let response: Response;
    try {
      response = await fetch(`${config.baseUrl}/embeddings`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${config.apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ model: config.model, input: inputs }),
        signal: AbortSignal.timeout(30_000),
      });
    } catch {
      if (attempt === 2) throw new ApiError(502, "EMBEDDING_FAILED", "Embedding request failed.");
      await new Promise((resolve) => setTimeout(resolve, 500 * (attempt + 1)));
      continue;
    }

    if (!response.ok) {
      if ((response.status === 429 || response.status >= 500) && attempt < 2) {
        await new Promise((resolve) => setTimeout(resolve, 750 * (attempt + 1)));
        continue;
      }
      throw new ApiError(502, "EMBEDDING_FAILED", "The embedding provider rejected the request.");
    }

    const payload = (await response.json()) as EmbeddingResponse;
    const embeddings = payload.data?.map((entry) => entry.embedding);
    if (
      !embeddings ||
      embeddings.length !== inputs.length ||
      !embeddings.every(
        (embedding) =>
          Array.isArray(embedding) &&
          embedding.length === EMBEDDING_DIMENSIONS &&
          embedding.every((value) => typeof value === "number" && Number.isFinite(value)),
      )
    ) {
      throw new ApiError(
        502,
        "EMBEDDING_DIMENSIONS_MISMATCH",
        `Embedding provider must return ${EMBEDDING_DIMENSIONS}-dimension vectors.`,
      );
    }

    return embeddings as number[][];
  }

  throw new ApiError(502, "EMBEDDING_FAILED", "Embedding request failed.");
}

export async function embedTexts(texts: string[]): Promise<number[][]> {
  if (!texts.length) return [];

  if (!embeddingsConfigured()) {
    return texts.map(deterministicEmbedding);
  }

  const results: number[][] = [];
  for (let index = 0; index < texts.length; index += MAX_BATCH_SIZE) {
    const batch = texts.slice(index, index + MAX_BATCH_SIZE);
    results.push(...(await requestEmbeddings(batch)));
  }
  return results;
}

export async function embedQuery(text: string): Promise<number[]> {
  if (!embeddingsConfigured()) return deterministicEmbedding(text);
  const [embedding] = await embedTexts([text]);
  return embedding;
}

export function toVectorLiteral(embedding: number[]): string {
  if (embedding.length !== EMBEDDING_DIMENSIONS) {
    throw new ApiError(500, "INVALID_EMBEDDING", "Embedding has an unexpected dimension.");
  }
  return `[${embedding.map((value) => (Number.isFinite(value) ? value.toFixed(8) : "0")).join(",")}]`;
}

export function contentChecksum(buffer: Buffer): string {
  return createHash("sha256").update(buffer).digest("hex");
}
