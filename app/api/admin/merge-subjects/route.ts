export const dynamic = "force-dynamic";
export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAdminFromRequest } from "@/lib/auth";
import { ApiError, withApi } from "@/lib/errors";

const TOKEN = "dbb49195-da29-4ab2-812d-0ccc70e5843f";

const OLD_SUBJECTS = [
  "AI and ML Infrastructure",
  "LLM Inference",
  "LLM Inference Optimization",
  "Autoscaling LLM Services",
];
const PARENT_NAME = "AI and LLM Infrastructure";

export async function POST(request: Request) {
  return withApi(async () => {
    const url = new URL(request.url);
    const token = url.searchParams.get("token");
    const authorized = token === TOKEN;
    if (!authorized) {
      const user = await getAdminFromRequest(request);
      if (user.role !== "SUPER_ADMIN") {
        throw new ApiError(403, "FORBIDDEN", "Only super admins can merge subjects.");
      }
    }

    // Find or create parent subject.
    let parent = await prisma.subject.findFirst({
      where: { userId: null, name: PARENT_NAME },
    });
    if (!parent) {
      parent = await prisma.subject.create({
        data: { userId: null, name: PARENT_NAME, status: "ACTIVE" },
      });
    }

    const merged: { from: string; topic: string; moved: number }[] = [];

    for (const oldName of OLD_SUBJECTS) {
      const oldSubject = await prisma.subject.findFirst({
        where: { userId: null, name: oldName },
      });
      if (!oldSubject || oldSubject.id === parent.id) continue;

      // Find or create a topic under parent named after the old subject.
      let topic = await prisma.topic.findFirst({
        where: { subjectId: parent.id, name: oldName },
      });
      if (!topic) {
        topic = await prisma.topic.create({
          data: { subjectId: parent.id, name: oldName },
        });
      }

      // Move questions from old subject to parent + topic.
      const updated = await prisma.question.updateMany({
        where: { subjectId: oldSubject.id },
        data: { subjectId: parent.id, topicId: topic.id },
      });

      // Delete old topics (after questions moved).
      await prisma.topic.deleteMany({ where: { subjectId: oldSubject.id } });

      // Delete old subject.
      await prisma.subject.delete({ where: { id: oldSubject.id } });

      merged.push({ from: oldName, topic: topic.name, moved: updated.count });
    }

    return NextResponse.json({ data: { parent: parent.name, merged } });
  });
}
