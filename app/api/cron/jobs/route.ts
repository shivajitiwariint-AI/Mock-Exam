import { timingSafeEqual } from "node:crypto";
import { ok } from "@/lib/api";
import { withApi } from "@/lib/errors";
import { drainJobs } from "@/lib/jobs";
import { cleanupRateLimitBuckets } from "@/lib/rate-limit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

function secretsMatch(provided: string, expected: string): boolean {
  const providedBuffer = Buffer.from(provided);
  const expectedBuffer = Buffer.from(expected);
  return (
    providedBuffer.length === expectedBuffer.length &&
    timingSafeEqual(providedBuffer, expectedBuffer)
  );
}

export async function GET(request: Request) {
  return withApi(async () => {
    const secret = process.env.CRON_SECRET?.trim();
    if (!secret) {
      return Response.json(
        { error: { code: "CRON_NOT_CONFIGURED", message: "CRON_SECRET is not set." } },
        { status: 503 },
      );
    }

    const authorization = request.headers.get("authorization") ?? "";
    const provided = authorization.startsWith("Bearer ")
      ? authorization.slice("Bearer ".length)
      : request.headers.get("x-cron-secret") ?? "";

    if (!provided || !secretsMatch(provided, secret)) {
      return Response.json(
        { error: { code: "UNAUTHORIZED", message: "Invalid cron credentials." } },
        { status: 401 },
      );
    }

    const jobs = await drainJobs(3, 45_000);
    await cleanupRateLimitBuckets();

    return ok({ jobs, ranAt: new Date().toISOString() });
  });
}
