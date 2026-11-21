import { randomUUID } from "node:crypto";
import { noContent, ok } from "@/lib/api";
import { requireStudent } from "@/lib/authz";
import { safeRecordAudit } from "@/lib/audit";
import { prisma } from "@/lib/db";
import { ApiError, withApi } from "@/lib/errors";
import { SUPPORTED_DOCUMENT_TYPES, sanitizeExtractedText } from "@/lib/extraction";
import { getOwnedInterviewPrep } from "@/lib/interviews";
import { MAX_STORED_TEXT, readUploadedDocument } from "@/lib/uploads";
import { deletePrivateObject, putPrivateObject } from "@/lib/storage";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function formString(form: FormData, name: string): string | undefined {
  const value = form.get(name);
  return typeof value === "string" ? value : undefined;
}

export async function GET(
  _request: Request,
  { params }: { params: { prepId: string } },
) {
  return withApi(async () => {
    const user = await requireStudent();
    const prepId = Number((await params).prepId);
    const prep = await getOwnedInterviewPrep(prepId, user.id);

    const questions = await prisma.interviewQuestion.findMany({
      where: { prepId: prep.id },
      orderBy: { order: "asc" },
      select: {
        id: true,
        order: true,
        questionText: true,
        category: true,
        difficulty: true,
      },
    });

    return ok({
      id: prep.id,
      title: prep.title,
      company: prep.company,
      role: prep.role,
      resumeFilename: prep.resumeFilename,
      jdFilename: prep.jdFilename,
      interviewDate: prep.interviewDate,
      actualQuestionsFilename: prep.actualQuestionsFilename,
      hasActualQuestions: Boolean(
        prep.actualQuestionsText || prep.actualQuestionsStorageKey,
      ),
      status: prep.status,
      errorMessage: prep.errorMessage,
      aiModel: prep.aiModel,
      targetQuestionCount: prep.targetQuestionCount,
      createdAt: prep.createdAt,
      updatedAt: prep.updatedAt,
      questionCount: prep._count.questions,
      sessionCount: prep._count.sessions,
      sessions: prep.sessions,
      questions,
    });
  });
}

export async function PATCH(
  request: Request,
  { params }: { params: { prepId: string } },
) {
  return withApi(async () => {
    const user = await requireStudent();
    const prepId = Number((await params).prepId);
    const prep = await prisma.interviewPrep.findFirst({
      where: { id: prepId, userId: user.id },
      select: { id: true, actualQuestionsStorageKey: true },
    });
    if (!prep) {
      throw new ApiError(404, "NOT_FOUND", "Interview preparation not found.");
    }

    let form: FormData;
    try {
      form = await request.formData();
    } catch {
      throw new ApiError(400, "INVALID_FORM", "Request body must be multipart form data.");
    }

    const data: {
      interviewDate?: Date | null;
      actualQuestionsText?: string | null;
      actualQuestionsFilename?: string | null;
      actualQuestionsStorageKey?: string | null;
    } = {};

    if (form.has("interviewDate")) {
      const rawDate = formString(form, "interviewDate")?.trim() ?? "";
      if (rawDate) {
        const parsed = new Date(`${rawDate}T00:00:00.000Z`);
        if (Number.isNaN(parsed.getTime())) {
          throw new ApiError(400, "INVALID_DATE", "Enter a valid interview date.");
        }
        data.interviewDate = parsed;
      } else {
        data.interviewDate = null;
      }
    }

    const fileEntry = form.get("actualQuestionsFile");
    const actualFile = fileEntry instanceof File && fileEntry.size > 0 ? fileEntry : null;
    const actualUpload = actualFile
      ? await readUploadedDocument(actualFile, "actual interview questions")
      : null;
    const textValue = formString(form, "actualQuestionsText")?.trim() ?? "";

    let oldStorageKeyToDelete: string | null = null;
    let newStorageKey: string | null = null;
    if (actualUpload) {
      newStorageKey = `interviews/${user.id}/actuals-${randomUUID()}.${actualUpload.extension}`;
      await putPrivateObject(
        newStorageKey,
        actualUpload.buffer,
        SUPPORTED_DOCUMENT_TYPES[actualUpload.extension],
      );
      data.actualQuestionsText = actualUpload.text.slice(0, MAX_STORED_TEXT);
      data.actualQuestionsFilename = actualFile?.name.slice(0, 255) ?? null;
      data.actualQuestionsStorageKey = newStorageKey;
      oldStorageKeyToDelete = prep.actualQuestionsStorageKey;
    } else if (textValue) {
      data.actualQuestionsText = sanitizeExtractedText(textValue).slice(0, MAX_STORED_TEXT);
    }

    if (Object.keys(data).length === 0) {
      throw new ApiError(400, "NO_UPDATES", "Add a date, questions, or a questions file.");
    }

    let updated;
    try {
      updated = await prisma.interviewPrep.update({
        where: { id: prep.id },
        data,
        select: {
          id: true,
          interviewDate: true,
          actualQuestionsFilename: true,
          actualQuestionsText: true,
        },
      });
    } catch (failure) {
      if (newStorageKey) {
        await deletePrivateObject(newStorageKey).catch(() => undefined);
      }
      throw failure;
    }

    if (oldStorageKeyToDelete) {
      await deletePrivateObject(oldStorageKeyToDelete).catch(() => undefined);
    }

    await safeRecordAudit({
      actorId: user.id,
      action: "INTERVIEW_ACTUAL_DETAILS_UPDATED",
      entityType: "InterviewPrep",
      entityId: String(prep.id),
      metadata: {
        hasInterviewDate: Boolean(updated.interviewDate),
        hasActualQuestions: Boolean(updated.actualQuestionsText),
      },
    });

    return ok({
      interviewDate: updated.interviewDate,
      actualQuestionsFilename: updated.actualQuestionsFilename,
      hasActualQuestions: Boolean(updated.actualQuestionsText),
    });
  });
}

export async function DELETE(
  _request: Request,
  { params }: { params: { prepId: string } },
) {
  return withApi(async () => {
    const user = await requireStudent();
    const prepId = Number((await params).prepId);

    const prep = await prisma.interviewPrep.findFirst({
      where: { id: prepId, userId: user.id },
      select: {
        id: true,
        resumeStorageKey: true,
        jdStorageKey: true,
        actualQuestionsStorageKey: true,
      },
    });
    if (!prep) {
      throw new ApiError(404, "NOT_FOUND", "Interview preparation not found.");
    }

    if (prep.resumeStorageKey) {
      await deletePrivateObject(prep.resumeStorageKey).catch(() => undefined);
    }
    if (prep.jdStorageKey) {
      await deletePrivateObject(prep.jdStorageKey).catch(() => undefined);
    }
    if (prep.actualQuestionsStorageKey) {
      await deletePrivateObject(prep.actualQuestionsStorageKey).catch(() => undefined);
    }
    await prisma.interviewPrep.delete({ where: { id: prep.id } });

    await safeRecordAudit({
      actorId: user.id,
      action: "INTERVIEW_PREP_DELETED",
      entityType: "InterviewPrep",
      entityId: String(prep.id),
    });

    return noContent();
  });
}
