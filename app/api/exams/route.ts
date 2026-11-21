import { ok } from "@/lib/api";
import { requireStudent } from "@/lib/authz";
import { listStudentExams } from "@/lib/exam-service";
import { withApi } from "@/lib/errors";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  return withApi(async () => {
    const user = await requireStudent();
    const exams = await listStudentExams(user.id);
    return ok(exams);
  });
}
