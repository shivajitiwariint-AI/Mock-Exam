import { ok, paginated, parsePagination } from "@/lib/api";
import { requireStudent } from "@/lib/authz";
import { getStudentHistory } from "@/lib/dashboard";
import { withApi } from "@/lib/errors";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  return withApi(async () => {
    const user = await requireStudent();
    const url = new URL(request.url);
    const { page, pageSize, skip, take } = parsePagination(url);
    const history = await getStudentHistory(user.id, skip, take);
    return ok(paginated(history.items, history.total, page, pageSize));
  });
}
