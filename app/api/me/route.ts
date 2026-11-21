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
      where: subjectIds === null ? {} : { id: { in: subjectIds } },
      orderBy: { name: "asc" },
      select: { id: true, name: true, slug: true, status: true },
    });

    return ok({ user, subjects });
  });
}
