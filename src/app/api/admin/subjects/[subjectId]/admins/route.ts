import { z } from "zod";
import { created, ok, parseJson } from "@/lib/api";
import { requireSubjectManage, requireSuperAdmin } from "@/lib/authz";
import { prisma } from "@/lib/db";
import { safeRecordAudit } from "@/lib/audit";
import { ApiError, withApi } from "@/lib/errors";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const assignSchema = z
  .object({
    userId: z.string().trim().min(1).optional(),
    email: z.string().trim().toLowerCase().email().optional(),
  })
  .refine((data) => Boolean(data.userId || data.email), {
    message: "Provide a user email or id.",
  });

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ subjectId: string }> },
) {
  return withApi(async () => {
    const { subjectId } = await params;
    await requireSubjectManage(subjectId);
    const admins = await prisma.subjectAdmin.findMany({
      where: { subjectId },
      orderBy: { createdAt: "asc" },
      select: {
        id: true,
        createdAt: true,
        user: { select: { id: true, name: true, email: true, status: true } },
      },
    });
    return ok(admins.map((admin) => ({ ...admin.user, assignedAt: admin.createdAt })));
  });
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ subjectId: string }> },
) {
  return withApi(async () => {
    const actor = await requireSuperAdmin();
    const { subjectId } = await params;
    const data = await parseJson(request, assignSchema);

    const subject = await prisma.subject.findUnique({
      where: { id: subjectId },
      select: { id: true },
    });
    if (!subject) throw new ApiError(404, "NOT_FOUND", "Subject not found.");

    const user = await prisma.user.findFirst({
      where: data.userId ? { id: data.userId } : { email: data.email },
      select: { id: true, name: true, email: true, role: true, status: true },
    });
    if (!user) throw new ApiError(404, "NOT_FOUND", "User not found.");
    if (user.role !== "SUBJECT_ADMIN" || user.status !== "ACTIVE") {
      throw new ApiError(
        422,
        "INVALID_ROLE",
        "The user must be an active subject admin before being assigned.",
      );
    }

    const existing = await prisma.subjectAdmin.findUnique({
      where: { subjectId_userId: { subjectId, userId: user.id } },
      select: { id: true },
    });
    if (existing) {
      throw new ApiError(409, "ALREADY_ASSIGNED", "This admin is already assigned.");
    }

    await prisma.subjectAdmin.create({
      data: { subjectId, userId: user.id, assignedById: actor.id },
    });

    await safeRecordAudit({
      actorId: actor.id,
      action: "SUBJECT_ADMIN_ASSIGNED",
      entityType: "Subject",
      entityId: subjectId,
      metadata: { userId: user.id },
    });

    return created({ subjectId, user });
  });
}
