import type { Difficulty, QuestionType } from "@/app/generated/prisma/client";

/**
 * Compatibility helpers for the original PGOS education pages, which expect a
 * `content` field on questions. The merged schema stores question text in
 * `questionText` (Mock Exam convention), so API responses expose both.
 */
export function toLegacyQuestion<T extends Record<string, unknown>>(question: T) {
  return {
    ...question,
    content: question.questionText,
  };
}

export function questionWriteData(questionData: {
  content: string;
  topicId?: number | null;
  subtopicId?: number | null;
  type: QuestionType;
  explanation?: string | null;
  difficulty: Difficulty;
}, answers: Array<{ content: string; isCorrect: boolean; order: number }>) {
  const options = answers.map((answer, index) => ({
    key: index < 26 ? String.fromCharCode(65 + index) : String(index + 1),
    text: answer.content,
  }));
  const correctIndex = answers.findIndex((answer) => answer.isCorrect);

  return {
    topicId: questionData.topicId ?? null,
    subtopicId: questionData.subtopicId ?? null,
    type: questionData.type,
    questionText: questionData.content,
    options,
    correctOption: correctIndex >= 0 ? options[correctIndex]?.key ?? null : null,
    explanation: questionData.explanation ?? null,
    difficulty: questionData.difficulty,
    answers: { create: answers },
  };
}
