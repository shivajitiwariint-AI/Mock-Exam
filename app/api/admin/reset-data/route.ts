export const dynamic = "force-dynamic";
export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAdminFromRequest } from "@/lib/auth";
import { ApiError, withApi } from "@/lib/errors";

const KEEP = new Set(["User", "UserProfile", "_prisma_migrations"]);

export async function POST(request: Request) {
  return withApi(async () => {
    const user = await getAdminFromRequest(request);
    if (user.role !== "SUPER_ADMIN") {
      throw new ApiError(403, "FORBIDDEN", "Only super admins can reset data.");
    }

    const rows = await prisma.$queryRawUnsafe<{ TABLE_NAME: string }[]>(
      "SELECT TABLE_NAME FROM information_schema.tables WHERE table_schema = DATABASE()",
    );

    const tables = rows
      .map((row) => row.TABLE_NAME)
      .filter((name) => /^[A-Za-z0-9_]+$/.test(name) && !KEEP.has(name));

    await prisma.$executeRawUnsafe("SET FOREIGN_KEY_CHECKS = 0");
    const deleted: string[] = [];
    for (const table of tables) {
      try {
        await prisma.$executeRawUnsafe(`TRUNCATE TABLE \`${table}\``);
        deleted.push(table);
      } catch (error) {
        // Fall back to DELETE if TRUNCATE is blocked (e.g. FK constraints).
        await prisma.$executeRawUnsafe(`DELETE FROM \`${table}\``);
        deleted.push(table);
      }
    }
    await prisma.$executeRawUnsafe("SET FOREIGN_KEY_CHECKS = 1");

    return NextResponse.json({
      data: {
        deleted,
        kept: [...KEEP],
        count: deleted.length,
      },
    });
  });
}
