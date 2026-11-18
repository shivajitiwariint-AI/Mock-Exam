import { parseJson, ok } from "@/lib/api";
import { requireStudent } from "@/lib/authz";
import { ApiError, withApi } from "@/lib/errors";
import { evaluateInterviewAnswer } from "@/lib/interviews";
import { llmConfigured } from "@/lib/llm";
import { enforceRateLimit } from "@/lib/rate-limit";
import { interviewAnswerSchema } from "@/lib/validation";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function POST(
  request: Request,
  { params }: { params: Promise<{ sessionId: string }> },
) {
  return withApi(async () => {
    const user = await requireStudent();
    const { sessionId } = await params;
    const data = await parseJson(request, interviewAnswerSchema);

    await enforceRateLimit(`interview-answer:${user.id}`, 60, 60 * 60 * 1000);

    if (!llmConfigured()) {
      throw new ApiError(
        503,
        "AI_NOT_CONFIGURED",
        "Interview feedback requires a configured AI provider.",
      );
    }

    const answer = await evaluateInterviewAnswer({
      sessionId,
      userId: user.id,
      questionId: data.questionId,
      answerText: data.answerText,
    });

    return ok({ answer });
  });
}
