import { ok, paginated, parsePagination } from "@/lib/api";
import { accessibleSubjectIds, requireUser, scopeSubjectIds } from "@/lib/authz";
import { prisma } from "@/lib/db";
import { withApi } from "@/lib/errors";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  return withApi(async () => {
    const user = await requireUser();
    const url = new URL(request.url);
    const { page, pageSize, skip, take } = parsePagination(url);
    const subjectId = url.searchParams.get("subjectId") || undefined;
    const topicId = url.searchParams.get("topicId") || undefined;

    const subjectFilter = await scopeSubjectIds(user, subjectId);
    const accessibleIds = await accessibleSubjectIds(user);

    const where = {
      status: "APPROVED" as const,
      ...(subjectFilter === null ? {} : { subjectId: { in: subjectFilter } }),
      ...(topicId ? { topicId } : {}),
    };

    const [total, questions, subjects] = await Promise.all([
      prisma.question.count({ where }),
      prisma.question.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip,
        take,
        select: {
          id: true,
          type: true,
          questionText: true,
          options: true,
          correctOption: true,
          explanation: true,
          difficulty: true,
          createdAt: true,
          topic: { select: { id: true, name: true } },
          subject: { select: { id: true, name: true } },
        },
      }),
      prisma.subject.findMany({
        where: {
          ...(accessibleIds === null ? {} : { id: { in: accessibleIds } }),
          ...(user.role === "STUDENT" ? { status: "ACTIVE" } : {}),
        },
        orderBy: { name: "asc" },
        select: {
          id: true,
          name: true,
          topics: {
            orderBy: { name: "asc" },
            select: { id: true, name: true },
          },
        },
      }),
    ]);

    return ok({
      ...paginated(
        questions.map((question) => ({
          ...question,
          options: Array.isArray(question.options) ? question.options : [],
        })),
        total,
        page,
        pageSize,
      ),
      subjects,
    });
  });
}
