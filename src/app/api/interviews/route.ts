import { randomUUID } from "node:crypto";
import { after } from "next/server";
import { accepted, ok } from "@/lib/api";
import { requireStudent } from "@/lib/authz";
import { safeRecordAudit } from "@/lib/audit";
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

export async function GET() {
  return withApi(async () => {
    const user = await requireStudent();

    const preps = await prisma.interviewPrep.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: "desc" },
      take: 50,
      select: {
        id: true,
        title: true,
        company: true,
        role: true,
        resumeFilename: true,
        jdFilename: true,
        status: true,
        errorMessage: true,
        aiModel: true,
        targetQuestionCount: true,
        interviewDate: true,
        actualQuestionsFilename: true,
        actualQuestionsText: true,
        actualQuestionsStorageKey: true,
        createdAt: true,
        updatedAt: true,
        _count: { select: { questions: true, sessions: true } },
        sessions: {
          orderBy: { startedAt: "desc" },
          take: 5,
          select: {
            id: true,
            status: true,
            startedAt: true,
            completedAt: true,
            overallScore: true,
          },
        },
      },
    });

    return ok(
      preps.map((prep) => ({
        id: prep.id,
        title: prep.title,
        company: prep.company,
        role: prep.role,
        resumeFilename: prep.resumeFilename,
        jdFilename: prep.jdFilename,
        status: prep.status,
        errorMessage: prep.errorMessage,
        aiModel: prep.aiModel,
        targetQuestionCount: prep.targetQuestionCount,
        createdAt: prep.createdAt,
        updatedAt: prep.updatedAt,
        interviewDate: prep.interviewDate,
        actualQuestionsFilename: prep.actualQuestionsFilename,
        hasActualQuestions: Boolean(
          prep.actualQuestionsText || prep.actualQuestionsStorageKey,
        ),
        questionCount: prep._count.questions,
        sessionCount: prep._count.sessions,
        sessions: prep.sessions,
      })),
    );
  });
}

export async function POST(request: Request) {
  return withApi(async () => {
    const user = await requireStudent();
    await enforceRateLimit(`interview-upload:${user.id}`, 10, 60 * 60 * 1000);

    if (!llmConfigured()) {
      throw new ApiError(
        503,
        "AI_NOT_CONFIGURED",
        "Interview generation requires a configured AI provider.",
      );
    }

    let form: FormData;
    try {
      form = await request.formData();
    } catch {
      throw new ApiError(400, "INVALID_FORM", "Expected a multipart form upload.");
    }

    const resumeFile = form.get("resume");
    if (!(resumeFile instanceof File)) {
      throw new ApiError(400, "RESUME_REQUIRED", "A resume file is required.");
    }

    const jdFileValue = form.get("jdFile");
    const jdFile = jdFileValue instanceof File && jdFileValue.size > 0 ? jdFileValue : null;
    const actualFileValue = form.get("actualQuestionsFile");
    const actualFile =
      actualFileValue instanceof File && actualFileValue.size > 0 ? actualFileValue : null;

    const meta = createInterviewPrepSchema.parse({
      title: form.get("title") || undefined,
      company: form.get("company") || undefined,
      role: form.get("role") || undefined,
      jdText: typeof form.get("jdText") === "string" ? form.get("jdText") : undefined,
      interviewDate: typeof form.get("interviewDate") === "string" ? form.get("interviewDate") : undefined,
      actualQuestionsText:
        typeof form.get("actualQuestionsText") === "string"
          ? form.get("actualQuestionsText")
          : undefined,
    });

    const resume = await readUploadedDocument(resumeFile, "resume");
    const jdUpload = jdFile ? await readUploadedDocument(jdFile, "job description") : null;
    const actualUpload = actualFile
      ? await readUploadedDocument(actualFile, "actual interview questions")
      : null;

    const jdText = jdUpload?.text ?? (meta.jdText ? sanitizeExtractedText(meta.jdText) : "");
    if (!jdText) {
      throw new ApiError(
        400,
        "JD_REQUIRED",
        "Upload a company job description or paste the JD text.",
      );
    }

    const actualQuestionsText =
      actualUpload?.text ??
      (meta.actualQuestionsText ? sanitizeExtractedText(meta.actualQuestionsText) : "");

    const resumeStorageKey = `interviews/${user.id}/${randomUUID()}.${resume.extension}`;
    const jdStorageKey = jdUpload
      ? `interviews/${user.id}/${randomUUID()}.${jdUpload.extension}`
      : null;
    const actualStorageKey = actualUpload
      ? `interviews/${user.id}/actuals-${randomUUID()}.${actualUpload.extension}`
      : null;

    await putPrivateObject(
      resumeStorageKey,
      resume.buffer,
      SUPPORTED_DOCUMENT_TYPES[resume.extension],
    );
    if (jdUpload && jdStorageKey) {
      await putPrivateObject(
        jdStorageKey,
        jdUpload.buffer,
        SUPPORTED_DOCUMENT_TYPES[jdUpload.extension],
      );
    }
    if (actualUpload && actualStorageKey) {
      await putPrivateObject(
        actualStorageKey,
        actualUpload.buffer,
        SUPPORTED_DOCUMENT_TYPES[actualUpload.extension],
      );
    }

    const title =
      meta.title ??
      ([meta.company, meta.role].filter(Boolean).join(" — ") || "Interview preparation");

    let prep;
    try {
      prep = await prisma.interviewPrep.create({
        data: {
          userId: user.id,
          title: title.slice(0, 160),
          company: meta.company ?? null,
          role: meta.role ?? null,
          resumeFilename: resumeFile.name.slice(0, 255),
          resumeStorageKey,
          jdFilename: jdFile ? jdFile.name.slice(0, 255) : null,
          jdStorageKey,
          resumeText: resume.text,
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
          resumeFilename: true,
          jdFilename: true,
          status: true,
          createdAt: true,
        },
      });
    } catch (error) {
      await deletePrivateObject(resumeStorageKey);
      if (jdStorageKey) await deletePrivateObject(jdStorageKey);
      if (actualStorageKey) await deletePrivateObject(actualStorageKey);
      throw error;
    }

    const generationJob = await enqueueJob(
      "QUESTION_GENERATION",
      { interviewPrepId: prep.id, requestedById: user.id },
      { maxAttempts: 3 },
    );

    after(async () => {
      try {
        await drainJobById(generationJob.id);
      } catch (error) {
        console.error("[interviews] question generation drain failed", {
          prepId: prep.id,
          message: error instanceof Error ? error.message : "unknown",
        });
      }
    });

    await safeRecordAudit({
      actorId: user.id,
      action: "INTERVIEW_PREP_CREATED",
      entityType: "InterviewPrep",
      entityId: prep.id,
      metadata: {
        company: prep.company,
        role: prep.role,
        exhaustiveQuestionBank: true,
      },
    });

    return accepted({
      prep: { ...prep, questionCount: 0, sessionCount: 0, sessions: [] },
    });
  });
}
