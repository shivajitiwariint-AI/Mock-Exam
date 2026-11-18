import { ok } from "@/lib/api";
import { requireRole } from "@/lib/authz";
import { getAdminDashboard } from "@/lib/dashboard";
import { withApi } from "@/lib/errors";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  return withApi(async () => {
    const user = await requireRole("SUPER_ADMIN", "SUBJECT_ADMIN");
    return ok(await getAdminDashboard(user));
  });
}
