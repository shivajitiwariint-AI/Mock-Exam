import { ok } from "@/lib/api";
import { requireStudent } from "@/lib/authz";
import { getStudentDashboard } from "@/lib/dashboard";
import { withApi } from "@/lib/errors";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  return withApi(async () => {
    const user = await requireStudent();
    return ok(await getStudentDashboard(user.id));
  });
}
