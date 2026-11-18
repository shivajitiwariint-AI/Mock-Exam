import { z } from "zod";
import { ok, paginated, parsePagination } from "@/lib/api";
import { requireSuperAdmin } from "@/lib/authz";
import { prisma } from "@/lib/db";
import { withApi } from "@/lib/errors";
import { listUsersQuerySchema } from "@/lib/validation";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  return withApi(async () => {
    await requireSuperAdmin();
    const url = new URL(request.url);
    const { page, pageSize, skip, take } = parsePagination(url);
    const filters = listUsersQuerySchema.parse({
      search: url.searchParams.get("search") ?? undefined,
      role: url.searchParams.get("role") ?? undefined,
      status: url.searchParams.get("status") ?? undefined,
    });

    const where = {
      ...(filters.role ? { role: filters.role } : {}),
      ...(filters.status ? { status: filters.status } : {}),
      ...(filters.search
        ? {
            OR: [
              { name: { contains: filters.search, mode: "insensitive" as const } },
              { email: { contains: filters.search, mode: "insensitive" as const } },
            ],
          }
        : {}),
    };

    const [total, users] = await Promise.all([
      prisma.user.count({ where }),
      prisma.user.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip,
        take,
        select: {
          id: true,
          email: true,
          name: true,
          role: true,
          status: true,
          lastLoginAt: true,
          createdAt: true,
          subjectAssignments: {
            select: { subject: { select: { id: true, name: true } } },
          },
        },
      }),
    ]);

    return ok(
      paginated(
        users.map((user) => ({
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
          status: user.status,
          lastLoginAt: user.lastLoginAt,
          createdAt: user.createdAt,
          subjects: user.subjectAssignments.map((assignment) => assignment.subject),
        })),
        total,
        page,
        pageSize,
      ),
    );
  });
}

export const userCreateSchema = z.object({
  name: z.string().trim().min(2).max(80),
  email: z.string().trim().toLowerCase().email().max(254),
  password: z.string().min(10).max(128),
  role: z.enum(["SUPER_ADMIN", "SUBJECT_ADMIN", "STUDENT"]).default("STUDENT"),
});
