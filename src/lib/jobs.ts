import type { Prisma, ProcessingJob } from "@prisma/client";
import { prisma } from "./db";
import { processDocument } from "./documents";
import { runQuestionGeneration, type QuestionGenerationPayload } from "./ai-questions";
import { generateInterviewQuestions } from "./interviews";
import { llmConfigured } from "./llm";

type JobOutcome = {
  processed: number;
  failed: number;
  followUpJobIds: string[];
};

function emptyOutcome(): JobOutcome {
  return { processed: 0, failed: 0, followUpJobIds: [] };
}

export async function enqueueJob(
  type: ProcessingJob["type"],
  payload: Prisma.InputJsonValue,
  options: { maxAttempts?: number; runAt?: Date } = {},
) {
  return prisma.processingJob.create({
    data: {
      type,
      payload,
      maxAttempts: options.maxAttempts ?? 3,
      runAt: options.runAt ?? new Date(),
    },
    select: { id: true, type: true, status: true, createdAt: true },
  });
}

async function executeJob(
  job: ProcessingJob,
): Promise<{ result: Prisma.InputJsonValue; followUpJobIds: string[] }> {
  if (job.type === "DOCUMENT_PROCESSING") {
    const payload = job.payload as { documentId?: unknown };
    if (typeof payload.documentId !== "string") {
      throw new Error("Job payload is missing documentId.");
    }

    const processingResult = await processDocument(payload.documentId);
    const followUpJobIds: string[] = [];

    const document = await prisma.document.findUnique({
      where: { id: payload.documentId },
      select: { subjectId: true, topicId: true, uploaderId: true },
    });

    if (document && llmConfigured()) {
      const questionJob = await enqueueJob("QUESTION_GENERATION", {
        subjectId: document.subjectId,
        topicId: document.topicId,
        documentId: payload.documentId,
        count: 5,
        difficulty: "MEDIUM",
        questionType: "SUBJECTIVE",
        generateAll: true,
        requestedById: document.uploaderId,
      });
      followUpJobIds.push(questionJob.id);

      await prisma.document
        .update({
          where: { id: payload.documentId },
          data: {
            questionGenerationStatus: "RUNNING",
            questionGenerationProgress: 5,
            questionGenerationMessage: "Question generation queued...",
            generatedQuestionCount: 0,
            questionGenerationCompletedAt: null,
          },
        })
        .catch(() => undefined);
    }

    return { result: processingResult, followUpJobIds };
  }

  const interviewPayload = job.payload as { interviewPrepId?: unknown };
  if (typeof interviewPayload.interviewPrepId === "string") {
    const result = await generateInterviewQuestions(interviewPayload.interviewPrepId);
    return { result: { interviewPrepId: interviewPayload.interviewPrepId, created: result.created }, followUpJobIds: [] };
  }

  const payload = job.payload as unknown as QuestionGenerationPayload;
  if (
    !payload ||
    typeof payload.subjectId !== "string" ||
    typeof payload.requestedById !== "string"
  ) {
    throw new Error("Job payload is invalid for question generation.");
  }

  const result = await runQuestionGeneration(payload, job.id);
  return { result, followUpJobIds: [] };
}

async function processJob(job: ProcessingJob): Promise<JobOutcome> {
  const claim = await prisma.processingJob.updateMany({
    where: { id: job.id, status: "QUEUED" },
    data: {
      status: "RUNNING",
      lockedAt: new Date(),
      attempts: { increment: 1 },
      progress: 5,
      progressMessage: "Job started...",
    },
  });
  if (claim.count === 0) return emptyOutcome();

  try {
    const execution = await executeJob(job);

    await prisma.processingJob.update({
      where: { id: job.id },
      data: {
        status: "COMPLETED",
        result: execution.result,
        lastError: null,
        lockedAt: null,
        progress: 100,
        progressMessage: "Completed.",
      },
    });

    return { processed: 1, failed: 0, followUpJobIds: execution.followUpJobIds };
  } catch (error) {
    const message =
      error instanceof Error ? error.message.slice(0, 1000) : "Job processing failed.";
    const attempts = job.attempts + 1;
    const exhausted = attempts >= job.maxAttempts;

    await prisma.processingJob.update({
      where: { id: job.id },
      data: {
        status: exhausted ? "FAILED" : "QUEUED",
        lastError: message,
        lockedAt: null,
        progress: exhausted ? undefined : 10,
        progressMessage: exhausted ? message : "Retrying...",
        runAt: new Date(Date.now() + Math.min(attempts * 30_000, 10 * 60_000)),
      },
    });

    if (job.type === "QUESTION_GENERATION") {
      const payload = job.payload as { documentId?: unknown; interviewPrepId?: unknown };
      if (typeof payload.interviewPrepId === "string" && exhausted) {
        await prisma.interviewPrep
          .update({
            where: { id: payload.interviewPrepId },
            data: {
              status: "FAILED",
              errorMessage: `Interview question generation failed: ${message}`,
            },
          })
          .catch(() => undefined);
      }
      if (typeof payload.documentId === "string") {
        await prisma.document
          .update({
            where: { id: payload.documentId },
            data: {
              questionGenerationStatus: exhausted ? "FAILED" : "RUNNING",
              questionGenerationProgress: exhausted ? undefined : 10,
              questionGenerationMessage: exhausted
                ? `Question generation failed: ${message}`
                : `Retrying question generation (attempt ${attempts} of ${job.maxAttempts})...`,
              ...(exhausted ? { questionGenerationCompletedAt: new Date() } : {}),
            },
          })
          .catch(() => undefined);
      }
    }

    if (exhausted) {
      console.error("[jobs] job failed", { id: job.id, type: job.type, attempts, message });
    }

    return { processed: 0, failed: exhausted ? 1 : 0, followUpJobIds: [] };
  }
}

async function processFollowUps(
  jobIds: string[],
  deadline: number,
): Promise<{ processed: number; failed: number }> {
  let processed = 0;
  let failed = 0;

  for (const jobId of jobIds) {
    if (Date.now() > deadline) break;

    const job = await prisma.processingJob.findUnique({ where: { id: jobId } });
    if (!job || job.status !== "QUEUED" || job.runAt > new Date()) continue;

    const outcome = await processJob(job);
    processed += outcome.processed;
    failed += outcome.failed;
  }

  return { processed, failed };
}

export async function drainJobById(
  jobId: string,
  budgetMs = 45_000,
): Promise<{ processed: number; failed: number }> {
  const deadline = Date.now() + budgetMs;
  const job = await prisma.processingJob.findUnique({ where: { id: jobId } });
  if (!job || job.status !== "QUEUED" || job.runAt > new Date()) {
    return { processed: 0, failed: 0 };
  }

  const outcome = await processJob(job);
  const followUps = await processFollowUps(outcome.followUpJobIds, deadline);

  return {
    processed: outcome.processed + followUps.processed,
    failed: outcome.failed + followUps.failed,
  };
}

export async function drainJobs(
  limit = 3,
  budgetMs = 45_000,
): Promise<{ processed: number; failed: number }> {
  const deadline = Date.now() + budgetMs;
  let processed = 0;
  let failed = 0;

  for (let index = 0; index < limit; index += 1) {
    if (Date.now() > deadline) break;

    const job = await prisma.processingJob.findFirst({
      where: { status: "QUEUED", runAt: { lte: new Date() } },
      orderBy: { createdAt: "asc" },
    });
    if (!job) break;

    const outcome = await processJob(job);
    processed += outcome.processed;
    failed += outcome.failed;

    const followUps = await processFollowUps(outcome.followUpJobIds, deadline);
    processed += followUps.processed;
    failed += followUps.failed;
  }

  return { processed, failed };
}
