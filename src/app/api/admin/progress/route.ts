import { ok, paginated, parsePagination } from "@/lib/api";
import { requireSuperAdmin } from "@/lib/authz";
import { getAdminStudentProgress } from "@/lib/admin-progress";
import { withApi } from "@/lib/errors";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  return withApi(async () => {
    await requireSuperAdmin();
    const url = new URL(request.url);
    const { page, pageSize, skip, take } = parsePagination(url);
    const search = (url.searchParams.get("search") ?? "").trim().slice(0, 120);

    const { items, total } = await getAdminStudentProgress(search, skip, take);
    return ok(paginated(items, total, page, pageSize));
  });
}
