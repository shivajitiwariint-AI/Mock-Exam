import { prisma } from "./db";
import { ApiError } from "./errors";

function shuffle<T>(items: T[]): T[] {
  const copy = [...items];
  for (let index = copy.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(Math.random() * (index + 1));
    [copy[index], copy[swapIndex]] = [copy[swapIndex], copy[index]];
  }
  return copy;
}

export async function resolveQuestionIds(input: {
  subjectId: string;
  topicId?: string | null;
  questionIds?: string[];
  randomCount?: number;
}): Promise<string[]> {
  if (input.questionIds?.length) {
    const questions = await prisma.question.findMany({
      where: {
        id: { in: input.questionIds },
        subjectId: input.subjectId,
        status: "APPROVED",
        type: "MCQ",
      },
      select: { id: true },
    });
    if (questions.length !== input.questionIds.length) {
      throw new ApiError(
        422,
        "INVALID_QUESTIONS",
        "Every selected question must be an approved MCQ that belongs to this subject.",
      );
    }
    return input.questionIds;
  }

  if (input.randomCount) {
    const candidates = await prisma.question.findMany({
      where: {
        subjectId: input.subjectId,
        status: "APPROVED",
        type: "MCQ",
        ...(input.topicId ? { topicId: input.topicId } : {}),
      },
      select: { id: true },
    });
    if (candidates.length < input.randomCount) {
      throw new ApiError(
        422,
        "NOT_ENOUGH_QUESTIONS",
        `Only ${candidates.length} approved MCQ questions are available for the requested selection.`,
      );
    }
    return shuffle(candidates)
      .slice(0, input.randomCount)
      .map((question) => question.id);
  }

  throw new ApiError(422, "NO_QUESTIONS", "Select at least one question.");
}
