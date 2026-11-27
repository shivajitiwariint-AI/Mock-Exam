import { createHash } from "node:crypto";
import { NextResponse } from "next/server";
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

/**
 * Same as enforceRateLimit, but returns a ready-to-send Response instead of
 * throwing. Useful for legacy routes that are not wrapped in withApi().
 */
export async function limitOrResponse(
  key: string,
  limit: number,
  windowMs: number,
): Promise<NextResponse | null> {
  try {
    await enforceRateLimit(key, limit, windowMs);
    return null;
  } catch (error) {
    if (error instanceof ApiError && error.status === 429) {
      const retryAfter = (error.details as { retryAfterSeconds?: number } | undefined)
        ?.retryAfterSeconds;
      return NextResponse.json(
        { error: error.message },
        {
          status: 429,
          headers: retryAfter ? { "Retry-After": String(retryAfter) } : undefined,
        },
      );
    }

    console.error("[rate-limit] bucket unavailable", error);
    return NextResponse.json(
      { error: "Rate limiting is temporarily unavailable. Please try again later." },
      { status: 503 },
    );
  }
}

export async function cleanupRateLimitBuckets(): Promise<void> {
  await prisma.rateLimitBucket.deleteMany({
    where: { expiresAt: { lt: new Date(Date.now() - 60 * 60 * 1000) } },
  });
}
