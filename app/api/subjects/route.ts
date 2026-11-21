import { ok } from "@/lib/api";
import { accessibleSubjectIds, requireUser } from "@/lib/authz";
import { prisma } from "@/lib/db";
import { withApi } from "@/lib/errors";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  return withApi(async () => {
    const user = await requireUser();
    const subjectIds = await accessibleSubjectIds(user);

    const subjects = await prisma.subject.findMany({
      where: {
        ...(subjectIds === null ? {} : { id: { in: subjectIds } }),
        ...(user.role === "STUDENT" ? { status: "ACTIVE" } : {}),
      },
      orderBy: { name: "asc" },
      select: {
        id: true,
        name: true,
        slug: true,
        description: true,
        status: true,
        _count: { select: { topics: true, exams: true, documents: true, questions: true } },
      },
    });

    return ok(
      subjects.map((subject) => ({
        id: subject.id,
        name: subject.name,
        slug: subject.slug,
        description: subject.description,
        status: subject.status,
        topicCount: subject._count.topics,
        examCount: subject._count.exams,
        documentCount: subject._count.documents,
        questionCount: subject._count.questions,
      })),
    );
  });
}
