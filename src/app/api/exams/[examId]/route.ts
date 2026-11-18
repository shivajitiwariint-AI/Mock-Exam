import { ok } from "@/lib/api";
import { requireStudent } from "@/lib/authz";
import { getStudentExamDetail } from "@/lib/exam-service";
import { withApi } from "@/lib/errors";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ examId: string }> },
) {
  return withApi(async () => {
    const user = await requireStudent();
    const { examId } = await params;
    const exam = await getStudentExamDetail(examId, user.id);
    return ok(exam);
  });
}
