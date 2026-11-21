import { randomUUID } from "node:crypto";
import { after } from "@/lib/after";
import type { Prisma } from "@/app/generated/prisma/client";
import { accepted, ok, paginated, parsePagination } from "@/lib/api";
import { safeRecordAudit } from "@/lib/audit";
import { requireRole } from "@/lib/authz";
import { prisma } from "@/lib/db";
import { ApiError, withApi } from "@/lib/errors";
import { sanitizeExtractedText, SUPPORTED_DOCUMENT_TYPES } from "@/lib/extraction";
import { EXHAUSTIVE_QUESTION_LIMIT } from "@/lib/interviews";
import { drainJobById, enqueueJob } from "@/lib/jobs";
import { llmConfigured } from "@/lib/llm";
import { enforceRateLimit } from "@/lib/rate-limit";
import { deletePrivateObject, putPrivateObject } from "@/lib/storage";
import { MAX_STORED_TEXT, readUploadedDocument } from "@/lib/uploads";
import { createInterviewPrepSchema } from "@/lib/validation";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 300;

function formString(form: FormData, name: string): string | undefined {
  const value = form.get(name);
  return typeof value === "string" ? value : undefined;
}

export async function GET(request: Request) {
  return withApi(async () => {
    const user = await requireRole("SUPER_ADMIN", "SUBJECT_ADMIN");
    const url = new URL(request.url);
    const { page, pageSize, skip, take } = parsePagination(url);
    const search = (url.searchParams.get("search") ?? "").trim().slice(0, 120);
    const company = (url.searchParams.get("company") ?? "").trim().slice(0, 120);

    const where: Prisma.InterviewPrepWhereInput = {};
    if (user.role === "SUBJECT_ADMIN") where.userId = user.id;
    if (company) where.company = { contains: company };
    if (search) {
      where.OR = [
        { title: { contains: search } },
        { company: { contains: search } },
        { role: { contains: search } },
        { jdText: { contains: search } },
      ];
    }

    const [total, preps] = await prisma.$transaction([
      prisma.interviewPrep.count({ where }),
      prisma.interviewPrep.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip,
        take,
        select: {
          id: true,
          title: true,
          company: true,
          role: true,
          jdFilename: true,
          jdText: true,
          interviewDate: true,
          actualQuestionsText: true,
          actualQuestionsFilename: true,
          status: true,
          targetQuestionCount: true,
          proctorEventCount: true,
          proctorFlagCount: true,
          createdAt: true,
          user: { select: { id: true, name: true, email: true } },
          _count: { select: { questions: true, sessions: true } },
          questions: {
            orderBy: { order: "asc" },
            select: {
              id: true,
              order: true,
              questionText: true,
              category: true,
              difficulty: true,
              expectedAnswer: true,
            },
          },
        },
      }),
    ]);

    return ok(
      paginated(
        preps.map((prep) => ({
          id: prep.id,
          title: prep.title,
          company: prep.company,
          role: prep.role,
          jdFilename: prep.jdFilename,
          jdPreview: prep.jdText ? prep.jdText.slice(0, 600) : null,
          interviewDate: prep.interviewDate,
          actualQuestionsFilename: prep.actualQuestionsFilename,
          actualQuestionsPreview: prep.actualQuestionsText
            ? prep.actualQuestionsText.slice(0, 2000)
            : null,
          status: prep.status,
          targetQuestionCount: prep.targetQuestionCount,
          proctorEventCount: prep.proctorEventCount,
          proctorFlagCount: prep.proctorFlagCount,
          questionCount: prep._count.questions,
          sessionCount: prep._count.sessions,
          createdAt: prep.createdAt,
          owner: prep.user,
          questions: prep.questions,
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
    const user = await requireRole("SUPER_ADMIN", "SUBJECT_ADMIN");
    await enforceRateLimit(`admin-interviews:create:${user.id}`, 20, 60 * 60 * 1000);

    if (!llmConfigured()) {
      throw new ApiError(
        503,
        "AI_NOT_CONFIGURED",
        "AI question generation is not configured. Add GROQ_API_KEY to the environment.",
      );
    }

    let form: FormData;
    try {
      form = await request.formData();
    } catch {
      throw new ApiError(400, "INVALID_FORM", "Request body must be multipart form data.");
    }

    const meta = createInterviewPrepSchema.parse({
      title: formString(form, "title"),
      company: formString(form, "company"),
      role: formString(form, "role"),
      jdText: formString(form, "jdText"),
      interviewDate: formString(form, "interviewDate"),
      actualQuestionsText: formString(form, "actualQuestionsText"),
    });
    if (!meta.company) {
      throw new ApiError(400, "COMPANY_REQUIRED", "Enter the company name.");
    }

    const fileEntry = form.get("jdFile");
    const jdFile = fileEntry instanceof File && fileEntry.size > 0 ? fileEntry : null;
    const actualFileEntry = form.get("actualQuestionsFile");
    const actualFile =
      actualFileEntry instanceof File && actualFileEntry.size > 0 ? actualFileEntry : null;

    const upload = jdFile ? await readUploadedDocument(jdFile, "job description") : null;
    const actualUpload = actualFile
      ? await readUploadedDocument(actualFile, "actual interview questions")
      : null;
    const jdText = upload?.text ?? (meta.jdText ? sanitizeExtractedText(meta.jdText) : "");
    if (!jdText) {
      throw new ApiError(400, "JD_REQUIRED", "Upload or paste the job description.");
    }
    const actualQuestionsText =
      actualUpload?.text ??
      (meta.actualQuestionsText ? sanitizeExtractedText(meta.actualQuestionsText) : "");

    const actualStorageKey = actualUpload
      ? `admin-interviews/${user.id}/actuals-${randomUUID()}.${actualUpload.extension}`
      : null;
    if (actualUpload && actualStorageKey) {
      await putPrivateObject(
        actualStorageKey,
        actualUpload.buffer,
        SUPPORTED_DOCUMENT_TYPES[actualUpload.extension],
      );
    }

    const title =
      meta.title ||
      [meta.company, meta.role].filter(Boolean).join(" — ") ||
      `${meta.company} interview questions`;

    let prep;
    try {
      prep = await prisma.interviewPrep.create({
        data: {
          userId: user.id,
          title: title.slice(0, 160),
          company: meta.company,
          role: meta.role ?? null,
          jdFilename: jdFile ? jdFile.name.slice(0, 255) : null,
          jdText: jdText.slice(0, MAX_STORED_TEXT),
          interviewDate: meta.interviewDate ?? null,
          actualQuestionsText: actualQuestionsText
            ? actualQuestionsText.slice(0, MAX_STORED_TEXT)
            : null,
          actualQuestionsFilename: actualFile ? actualFile.name.slice(0, 255) : null,
          actualQuestionsStorageKey: actualStorageKey,
          targetQuestionCount: EXHAUSTIVE_QUESTION_LIMIT,
          status: "PROCESSING",
        },
        select: {
          id: true,
          title: true,
          company: true,
          role: true,
          interviewDate: true,
          status: true,
        },
      });
    } catch (error) {
      if (actualStorageKey) await deletePrivateObject(actualStorageKey);
      throw error;
    }

    await safeRecordAudit({
      actorId: user.id,
      action: "INTERVIEW_KIT_CREATED",
      entityType: "InterviewPrep",
      entityId: String(prep.id),
      metadata: {
        company: prep.company,
        role: prep.role,
        exhaustiveQuestionBank: true,
        source: "ADMIN",
      },
    });

    const generationJob = await enqueueJob(
      "QUESTION_GENERATION",
      { interviewPrepId: prep.id, requestedById: user.id },
      { maxAttempts: 3 },
    );

    after(async () => {
      try {
        await drainJobById(generationJob.id);
      } catch (error) {
        console.error("[admin-interviews] question generation drain failed", {
          prepId: prep.id,
          message: error instanceof Error ? error.message : String(error),
        });
      }
    });

    return accepted({ prep });
  });
}
