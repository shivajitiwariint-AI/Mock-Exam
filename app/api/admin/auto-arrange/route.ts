export const dynamic = "force-dynamic";
export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAdminFromRequest } from "@/lib/auth";
import { ApiError, withApi } from "@/lib/errors";

export async function POST(request: Request) {
  return withApi(async () => {
    const user = await getAdminFromRequest(request);
    if (user.role !== "SUPER_ADMIN") {
      throw new ApiError(403, "FORBIDDEN", "Only super admins can auto-arrange questions.");
    }

    // Find or create a "General" subject (shared, userId = null).
    let subject = await prisma.subject.findFirst({
      where: { userId: null, name: "General" },
    });
    if (!subject) {
      subject = await prisma.subject.create({
        data: { userId: null, name: "General", status: "ACTIVE" },
      });
    }

    // Find or create a "General" topic under it.
    let topic = await prisma.topic.findFirst({
      where: { subjectId: subject.id, name: "General" },
    });
    if (!topic) {
      topic = await prisma.topic.create({
        data: { subjectId: subject.id, name: "General" },
      });
    }

    const result = await prisma.question.updateMany({
      where: {
        OR: [{ subjectId: null }, { topicId: null }],
      },
      data: { subjectId: subject.id, topicId: topic.id },
    });

    return NextResponse.json({
      data: {
        arranged: result.count,
        subject: subject.name,
        topic: topic.name,
      },
    });
  });
}
