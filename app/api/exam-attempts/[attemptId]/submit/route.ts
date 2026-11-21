import { ok } from "@/lib/api";
import { requireStudent } from "@/lib/authz";
import { finalizeAttempt, getAttemptView } from "@/lib/exam-service";
import { withApi } from "@/lib/errors";
import { enforceRateLimit } from "@/lib/rate-limit";

export const runtime = "nodejs";

export async function POST(
  _request: Request,
  { params }: { params: { attemptId: string } },
) {
  return withApi(async () => {
    const user = await requireStudent();
    const attemptId = Number((await params).attemptId);
    await enforceRateLimit(`exam-submit:${user.id}`, 20, 60_000);

    await finalizeAttempt(attemptId, user.id);
    const attempt = await getAttemptView(attemptId, user.id);
    return ok(attempt);
  });
}
