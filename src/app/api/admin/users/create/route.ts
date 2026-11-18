import bcrypt from "bcryptjs";
import { created, parseJson } from "@/lib/api";
import { requireSuperAdmin } from "@/lib/authz";
import { prisma } from "@/lib/db";
import { safeRecordAudit } from "@/lib/audit";
import { ApiError, withApi } from "@/lib/errors";
import { createUserSchema } from "@/lib/validation";

export const runtime = "nodejs";

export async function POST(request: Request) {
  return withApi(async () => {
    const actor = await requireSuperAdmin();
    const data = await parseJson(request, createUserSchema);

    if (data.role !== "SUBJECT_ADMIN" && data.subjectIds?.length) {
      throw new ApiError(
        400,
        "INVALID_ASSIGNMENT",
        "Only subject admins can be assigned to subjects.",
      );
    }

    if (data.subjectIds?.length) {
      const subjects = await prisma.subject.findMany({
        where: { id: { in: data.subjectIds } },
        select: { id: true },
      });
      if (subjects.length !== data.subjectIds.length) {
        throw new ApiError(400, "INVALID_SUBJECT", "One or more subjects were not found.");
      }
    }

    const user = await prisma.user.create({
      data: {
        name: data.name,
        email: data.email,
        passwordHash: await bcrypt.hash(data.password, 12),
        role: data.role,
        status: "ACTIVE",
        ...(data.subjectIds?.length
          ? {
              subjectAssignments: {
                create: data.subjectIds.map((subjectId) => ({
                  subjectId,
                  assignedById: actor.id,
                })),
              },
            }
          : {}),
      },
      select: { id: true, email: true, name: true, role: true, status: true, createdAt: true },
    });

    await safeRecordAudit({
      actorId: actor.id,
      action: "USER_CREATED",
      entityType: "User",
      entityId: user.id,
      metadata: { role: user.role },
    });

    return created(user);
  });
}
