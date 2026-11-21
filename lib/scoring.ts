export type ScoringQuestion = {
  marks: number;
  correctOption: string;
  selectedOption: string | null;
};

export type ScoringConfig = {
  passPercentage: number;
  negativeMarks: number;
};

export type ScoringResult = {
  score: number;
  maxScore: number;
  percentage: number;
  correctCount: number;
  incorrectCount: number;
  unansweredCount: number;
  passed: boolean;
};

export function roundPercentage(value: number): number {
  return Math.round(value * 100) / 100;
}

/**
 * Deterministic, server-side scoring for objective (MCQ) questions.
 * A wrong answer subtracts the configured negative marks; the total cannot
 * drop below zero. Unanswered questions are neutral.
 */
export function scoreAttempt(
  questions: ScoringQuestion[],
  config: ScoringConfig,
): ScoringResult {
  let score = 0;
  let maxScore = 0;
  let correctCount = 0;
  let incorrectCount = 0;
  let unansweredCount = 0;

  for (const question of questions) {
    const marks = Math.max(0, question.marks);
    maxScore += marks;

    if (question.selectedOption === null || question.selectedOption === "") {
      unansweredCount += 1;
    } else if (question.selectedOption === question.correctOption) {
      correctCount += 1;
      score += marks;
    } else {
      incorrectCount += 1;
      score -= Math.max(0, config.negativeMarks);
    }
  }

  score = Math.max(0, score);
  const percentage = maxScore > 0 ? roundPercentage((score / maxScore) * 100) : 0;

  return {
    score,
    maxScore,
    percentage,
    correctCount,
    incorrectCount,
    unansweredCount,
    passed: maxScore > 0 && percentage >= config.passPercentage,
  };
}
