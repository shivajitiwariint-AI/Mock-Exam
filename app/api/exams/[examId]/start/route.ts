import { created } from "@/lib/api";
import { requireStudent } from "@/lib/authz";
import { startExamAttempt } from "@/lib/exam-service";
import { withApi } from "@/lib/errors";
import { enforceRateLimit } from "@/lib/rate-limit";

export const runtime = "nodejs";

export async function POST(
  _request: Request,
  { params }: { params: { examId: string } },
) {
  return withApi(async () => {
    const user = await requireStudent();
    const examId = Number((await params).examId);
    await enforceRateLimit(`exam-start:${user.id}`, 20, 60_000);
    const attempt = await startExamAttempt(examId, user.id);
    return created(attempt);
  });
}
