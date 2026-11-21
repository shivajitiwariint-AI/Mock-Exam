import type { SubjectStatus } from "@/app/generated/prisma/client";
import { created, ok, paginated, parseJson, parsePagination } from "@/lib/api";
import { accessibleSubjectIds, requireRole } from "@/lib/authz";
import { prisma } from "@/lib/db";
import { safeRecordAudit } from "@/lib/audit";
import { withApi } from "@/lib/errors";
import { createUniqueSubjectSlug } from "@/lib/slug";
import { createSubjectSchema } from "@/lib/validation";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  return withApi(async () => {
    const user = await requireRole("SUPER_ADMIN", "SUBJECT_ADMIN");
    const subjectIds = await accessibleSubjectIds(user);
    const url = new URL(request.url);
    const { page, pageSize, skip, take } = parsePagination(url);
    const search = url.searchParams.get("search")?.trim();
    const statusParam = url.searchParams.get("status");
    const status: SubjectStatus | undefined =
      statusParam === "ACTIVE" || statusParam === "INACTIVE" ? statusParam : undefined;

    const where = {
      ...(subjectIds === null ? {} : { id: { in: subjectIds } }),
      ...(status ? { status } : {}),
      ...(search ? { name: { contains: search, mode: "insensitive" as const } } : {}),
    };

    const [total, subjects] = await Promise.all([
      prisma.subject.count({ where }),
      prisma.subject.findMany({
        where,
        orderBy: { name: "asc" },
        skip,
        take,
        select: {
          id: true,
          name: true,
          slug: true,
          description: true,
          status: true,
          createdAt: true,
          topics: { select: { id: true, name: true }, orderBy: { name: "asc" } },
          admins: {
            select: { user: { select: { id: true, name: true, email: true } } },
          },
          _count: { select: { documents: true, questions: true, exams: true } },
        },
      }),
    ]);

    return ok(
      paginated(
        subjects.map((subject) => ({
          ...subject,
          admins: subject.admins.map((admin) => admin.user),
          documentCount: subject._count.documents,
          questionCount: subject._count.questions,
          examCount: subject._count.exams,
        })),
        total,
        page,
        pageSize,
      ),
    );
  });
}

export async function POST(request: Request) {
  return withApi(async () => {
    const user = await requireRole("SUPER_ADMIN");
    const data = await parseJson(request, createSubjectSchema);
    const slug = await createUniqueSubjectSlug(data.name);
    const topicNames = [
      ...new Set((data.topics ?? []).map((topic) => topic.trim()).filter(Boolean)),
    ];

    const subject = await prisma.subject.create({
      data: {
        name: data.name,
        slug,
        description: data.description ?? null,
        ...(topicNames.length
          ? { topics: { create: topicNames.map((name) => ({ name })) } }
          : {}),
      },
      select: { id: true, name: true, slug: true, status: true, createdAt: true },
    });

    await safeRecordAudit({
      actorId: user.id,
      action: "SUBJECT_CREATED",
      entityType: "Subject",
      entityId: String(subject.id),
      metadata: { topicCount: topicNames.length },
    });

    return created(subject);
  });
}
