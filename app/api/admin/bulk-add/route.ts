export const dynamic = "force-dynamic";
export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAdminFromRequest } from "@/lib/auth";
import { ApiError, withApi } from "@/lib/errors";

const TOKEN = "dbb49195-da29-4ab2-812d-0ccc70e5843f";

export async function POST(request: Request) {
  return withApi(async () => {
    const url = new URL(request.url);
    const token = url.searchParams.get("token");
    const authorized = token === TOKEN;
    if (!authorized) {
      const user = await getAdminFromRequest(request);
      if (user.role !== "SUPER_ADMIN") {
        throw new ApiError(403, "FORBIDDEN", "Only super admins can bulk add.");
      }
    }

    const body = await request.json();
    const items = Array.isArray(body?.items) ? body.items : [];
    let total = 0;
    const subjects: string[] = [];

    for (const item of items) {
      const subjectName = String(item?.subject ?? "").trim();
      const questions = Array.isArray(item?.questions) ? item.questions : [];
      if (!subjectName || questions.length === 0) continue;

      let subject = await prisma.subject.findFirst({
        where: { userId: null, name: subjectName },
      });
      if (!subject) {
        subject = await prisma.subject.create({
          data: { userId: null, name: subjectName, status: "ACTIVE" },
        });
      }
      subjects.push(subject.name);

      for (const q of questions) {
        const text = String(q ?? "").trim();
        if (!text) continue;
        await prisma.question.create({
          data: {
            userId: null,
            subjectId: subject.id,
            questionText: text,
            type: "MCQ",
            difficulty: "MEDIUM",
            status: "APPROVED",
            source: "MANUAL",
          },
        });
        total += 1;
      }
    }

    return NextResponse.json({ data: { subjects, total } });
  });
}
