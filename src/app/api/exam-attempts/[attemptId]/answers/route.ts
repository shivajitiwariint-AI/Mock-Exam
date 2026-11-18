import { ok, parseJson } from "@/lib/api";
import { requireStudent } from "@/lib/authz";
import { saveAttemptAnswers } from "@/lib/exam-service";
import { withApi } from "@/lib/errors";
import { saveAnswersSchema } from "@/lib/validation";

export const runtime = "nodejs";

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ attemptId: string }> },
) {
  return withApi(async () => {
    const user = await requireStudent();
    const { attemptId } = await params;
    const { answers } = await parseJson(request, saveAnswersSchema);
    const result = await saveAttemptAnswers(attemptId, user.id, answers);
    return ok(result);
  });
}
