import { created, ok, parseJson } from "@/lib/api";
import { requireSubjectManage } from "@/lib/authz";
import { prisma } from "@/lib/db";
import { safeRecordAudit } from "@/lib/audit";
import { withApi } from "@/lib/errors";
import { createTopicSchema } from "@/lib/validation";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ subjectId: string }> },
) {
  return withApi(async () => {
    const { subjectId } = await params;
    await requireSubjectManage(subjectId);
    const topics = await prisma.topic.findMany({
      where: { subjectId },
      orderBy: { name: "asc" },
      select: {
        id: true,
        name: true,
        description: true,
        _count: { select: { questions: true, exams: true } },
      },
    });
    return ok(
      topics.map((topic) => ({
        ...topic,
        questionCount: topic._count.questions,
        examCount: topic._count.exams,
      })),
    );
  });
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ subjectId: string }> },
) {
  return withApi(async () => {
    const { subjectId } = await params;
    const { user } = await requireSubjectManage(subjectId);
    const data = await parseJson(request, createTopicSchema);

    const topic = await prisma.topic.create({
      data: { subjectId, name: data.name, description: data.description ?? null },
      select: { id: true, name: true, description: true, createdAt: true },
    });

    await safeRecordAudit({
      actorId: user.id,
      action: "TOPIC_CREATED",
      entityType: "Topic",
      entityId: topic.id,
      metadata: { subjectId },
    });

    return created(topic);
  });
}
