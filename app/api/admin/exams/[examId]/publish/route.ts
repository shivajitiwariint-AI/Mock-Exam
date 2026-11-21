import { ok } from "@/lib/api";
import { requireSubjectManage } from "@/lib/authz";
import { prisma } from "@/lib/db";
import { safeRecordAudit } from "@/lib/audit";
import { ApiError, withApi } from "@/lib/errors";
import { publishExamSchema } from "@/lib/validation";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(
  request: Request,
  { params }: { params: { examId: string } },
) {
  return withApi(async () => {
    const examId = Number((await params).examId);
    const body = await request.json().catch(() => ({}));
    const data = publishExamSchema.parse(body);

    const exam = await prisma.exam.findUnique({
      where: { id: examId },
      select: {
        id: true,
        subjectId: true,
        status: true,
        availabilityStart: true,
        availabilityEnd: true,
        questions: { select: { question: { select: { status: true } } } },
      },
    });
    if (!exam) throw new ApiError(404, "NOT_FOUND", "Exam not found.");
    const { user } = await requireSubjectManage(exam.subjectId);

    if (exam.status === "ARCHIVED") {
      throw new ApiError(409, "EXAM_ARCHIVED", "Archived exams cannot be published.");
    }

    if (data.published) {
      if (!exam.questions.length) {
        throw new ApiError(422, "NO_QUESTIONS", "Add questions before publishing.");
      }
      if (exam.questions.some((row) => row.question.status !== "APPROVED")) {
        throw new ApiError(
          422,
          "UNAPPROVED_QUESTIONS",
          "Every question must be approved before publishing.",
        );
      }
      if (exam.availabilityEnd <= new Date()) {
        throw new ApiError(422, "WINDOW_CLOSED", "The availability window has already ended.");
      }
    }

    const updated = await prisma.exam.update({
      where: { id: examId },
      data: data.published
        ? { status: "PUBLISHED", publishedAt: new Date() }
        : { status: "UNPUBLISHED" },
      select: { id: true, status: true, publishedAt: true },
    });

    await safeRecordAudit({
      actorId: user.id,
      action: data.published ? "EXAM_PUBLISHED" : "EXAM_UNPUBLISHED",
      entityType: "Exam",
      entityId: String(examId),
      metadata: { subjectId: exam.subjectId },
    });

    return ok(updated);
  });
}
