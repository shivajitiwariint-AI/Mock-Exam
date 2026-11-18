import { noContent, ok, parseJson } from "@/lib/api";
import { requireSubjectManage } from "@/lib/authz";
import { prisma } from "@/lib/db";
import { safeRecordAudit } from "@/lib/audit";
import { ApiError, withApi } from "@/lib/errors";
import { updateTopicSchema } from "@/lib/validation";

export const runtime = "nodejs";

async function loadTopic(topicId: string) {
  const topic = await prisma.topic.findUnique({
    where: { id: topicId },
    select: { id: true, subjectId: true, name: true },
  });
  if (!topic) throw new ApiError(404, "NOT_FOUND", "Topic not found.");
  return topic;
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ topicId: string }> },
) {
  return withApi(async () => {
    const { topicId } = await params;
    const topic = await loadTopic(topicId);
    const { user } = await requireSubjectManage(topic.subjectId);
    const data = await parseJson(request, updateTopicSchema);

    const updated = await prisma.topic.update({
      where: { id: topicId },
      data,
      select: { id: true, name: true, description: true },
    });

    await safeRecordAudit({
      actorId: user.id,
      action: "TOPIC_UPDATED",
      entityType: "Topic",
      entityId: topicId,
      metadata: data,
    });

    return ok(updated);
  });
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ topicId: string }> },
) {
  return withApi(async () => {
    const { topicId } = await params;
    const topic = await loadTopic(topicId);
    const { user } = await requireSubjectManage(topic.subjectId);

    await prisma.topic.delete({ where: { id: topicId } });

    await safeRecordAudit({
      actorId: user.id,
      action: "TOPIC_DELETED",
      entityType: "Topic",
      entityId: topicId,
      metadata: { subjectId: topic.subjectId, name: topic.name },
    });

    return noContent();
  });
}
