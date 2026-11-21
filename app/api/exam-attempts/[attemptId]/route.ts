import { ok } from "@/lib/api";
import { requireStudent } from "@/lib/authz";
import { getAttemptView } from "@/lib/exam-service";
import { withApi } from "@/lib/errors";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(
  _request: Request,
  { params }: { params: { attemptId: string } },
) {
  return withApi(async () => {
    const user = await requireStudent();
    const attemptId = Number((await params).attemptId);
    const attempt = await getAttemptView(attemptId, user.id);
    return ok(attempt);
  });
}
