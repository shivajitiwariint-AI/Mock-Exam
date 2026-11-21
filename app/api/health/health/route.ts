import { ok } from "@/lib/api";
import { prisma } from "@/lib/db";
import { withApi } from "@/lib/errors";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  return withApi(async () => {
    const started = Date.now();

    try {
      await prisma.$queryRaw`SELECT 1`;
      return ok({
        status: "ok",
        database: "up",
        uptimeSeconds: Math.round(process.uptime()),
        latencyMs: Date.now() - started,
        timestamp: new Date().toISOString(),
      });
    } catch {
      return new Response(
        JSON.stringify({
          ok: false,
          error: {
            code: "DATABASE_DOWN",
            message: "The database is unreachable.",
            status: "degraded",
            latencyMs: Date.now() - started,
            timestamp: new Date().toISOString(),
          },
        }),
        { status: 503, headers: { "Content-Type": "application/json" } },
      );
    }
  });
}