import { ok } from "@/lib/api";
import { requireStudent } from "@/lib/authz";
import { withApi } from "@/lib/errors";
import { getInterviewSessionView } from "@/lib/interviews";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ sessionId: string }> },
) {
  return withApi(async () => {
    const user = await requireStudent();
    const { sessionId } = await params;
    return ok(await getInterviewSessionView(sessionId, user.id));
  });
}
