import { created, ok, paginated, parseJson, parsePagination } from "@/lib/api";
import { requireSubjectManage } from "@/lib/authz";
import { prisma } from "@/lib/db";
import { safeRecordAudit } from "@/lib/audit";
import { ApiError, withApi } from "@/lib/errors";
import { questionContentHash } from "@/lib/question-utils";
import { createQuestionSchema, listQuestionsQuerySchema } from "@/lib/validation";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ subjectId: string }> },
) {
  return withApi(async () => {
    const { subjectId } = await params;
    await requireSubjectManage(subjectId);
    const url = new URL(request.url);
    const { page, pageSize, skip, take } = parsePagination(url);
    const filters = listQuestionsQuerySchema.parse({
      status: url.searchParams.get("status") ?? undefined,
      topicId: url.searchParams.get("topicId") ?? undefined,
      search: url.searchParams.get("search") ?? undefined,
    });

    const where = {
      subjectId,
      ...(filters.status ? { status: filters.status } : {}),
      ...(filters.topicId ? { topicId: filters.topicId } : {}),
      ...(filters.search
        ? { questionText: { contains: filters.search, mode: "insensitive" as const } }
        : {}),
    };

    const [total, questions] = await Promise.all([
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
          status: true,
          source: true,
          aiModel: true,
          createdAt: true,
          updatedAt: true,
          reviewedAt: true,
          topic: { select: { id: true, name: true } },
          createdBy: { select: { id: true, name: true, email: true } },
          _count: { select: { examQuestions: true } },
        },
      }),
    ]);

    return ok(
      paginated(
        questions.map((question) => ({
          ...question,
          examUsageCount: question._count.examQuestions,
        })),
        total,
        page,
        pageSize,
      ),
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
    const data = await parseJson(request, createQuestionSchema);

    if (data.topicId) {
      const topic = await prisma.topic.findFirst({
        where: { id: data.topicId, subjectId },
        select: { id: true },
      });
      if (!topic) {
        throw new ApiError(400, "INVALID_TOPIC", "Topic does not belong to this subject.");
      }
    }

    const options = data.type === "SUBJECTIVE" ? [] : data.options;
    const correctOption = data.type === "SUBJECTIVE" ? null : data.correctOption ?? null;
    const contentHash = questionContentHash(data.questionText, options);
    const duplicate = await prisma.question.findFirst({
      where: { subjectId, contentHash },
      select: { id: true },
    });
    if (duplicate) {
      throw new ApiError(409, "DUPLICATE_QUESTION", "An identical question already exists.");
    }

    const question = await prisma.question.create({
      data: {
        subjectId,
        topicId: data.topicId ?? null,
        type: data.type,
        questionText: data.questionText,
        options,
        correctOption,
        explanation: data.explanation ?? null,
        difficulty: data.difficulty,
        status: data.status,
        source: "MANUAL",
        contentHash,
        createdById: user.id,
      },
      select: {
        id: true,
        type: true,
        questionText: true,
        options: true,
        correctOption: true,
        explanation: true,
        difficulty: true,
        status: true,
        source: true,
        createdAt: true,
      },
    });

    await safeRecordAudit({
      actorId: user.id,
      action: "QUESTION_CREATED",
      entityType: "Question",
      entityId: question.id,
      metadata: { subjectId, status: question.status },
    });

    return created(question);
  });
}
