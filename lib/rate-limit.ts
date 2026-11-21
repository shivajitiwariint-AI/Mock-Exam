type RateLimitEntry = { count: number; resetAt: number }

const store = new Map<string, RateLimitEntry>()
const WINDOW_MS = 60 * 1000 // 1 minute
const MAX_REQUESTS = 10

/** Lightweight in-memory limiter used by the PGOS auth routes. */
export function rateLimit(ip: string): { success: boolean } {
  const now = Date.now()
  const entry = store.get(ip)

  if (!entry || now > entry.resetAt) {
    store.set(ip, { count: 1, resetAt: now + WINDOW_MS })
    return { success: true }
  }

  if (entry.count >= MAX_REQUESTS) {
    return { success: false }
  }

  entry.count++
  return { success: true }
}

import { createHash } from "node:crypto";
import { prisma } from "./db";
import { ApiError } from "./errors";

function hashKey(key: string): string {
  return createHash("sha256").update(key).digest("hex");
}

/**
 * Increments a fixed-window rate limit bucket, resetting the counter when the
 * previous window has expired. Throws a 429 ApiError when the limit is
 * exceeded.
 */
export async function enforceRateLimit(
  key: string,
  limit: number,
  windowMs: number,
): Promise<void> {
  const now = new Date();
  const expiresAt = new Date(now.getTime() + windowMs);
  const bucketKey = hashKey(key);

  const existing = await prisma.rateLimitBucket.findUnique({
    where: { key: bucketKey },
    select: { expiresAt: true },
  });

  if (!existing || existing.expiresAt <= now) {
    await prisma.rateLimitBucket.upsert({
      where: { key: bucketKey },
      update: { count: 1, windowStart: now, expiresAt, updatedAt: now },
      create: { key: bucketKey, count: 1, windowStart: now, expiresAt, updatedAt: now },
    });
    return;
  }

  const bucket = await prisma.rateLimitBucket.update({
    where: { key: bucketKey },
    data: { count: { increment: 1 }, updatedAt: now },
  });

  if (Number(bucket.count) > limit) {
    const retryAfterSeconds = Math.max(
      1,
      Math.ceil((new Date(bucket.expiresAt).getTime() - now.getTime()) / 1000),
    );
    throw new ApiError(429, "RATE_LIMITED", "Too many requests. Please try again later.", {
      retryAfterSeconds,
    });
  }
}

export async function cleanupRateLimitBuckets(): Promise<void> {
  await prisma.rateLimitBucket.deleteMany({
    where: { expiresAt: { lt: new Date(Date.now() - 60 * 60 * 1000) } },
  });
}
