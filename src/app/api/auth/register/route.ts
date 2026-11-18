import bcrypt from "bcryptjs";
import { prisma } from "@/lib/db";
import { getClientIp, created, parseJson } from "@/lib/api";
import { ApiError } from "@/lib/errors";
import { withApi } from "@/lib/errors";
import { enforceRateLimit } from "@/lib/rate-limit";
import { safeRecordAudit } from "@/lib/audit";
import { registerSchema } from "@/lib/validation";

export const runtime = "nodejs";

export async function POST(request: Request) {
  return withApi(async () => {
    const ip = getClientIp(request);
    await enforceRateLimit(`register:${ip}`, 5, 60 * 60 * 1000);

    const data = await parseJson(request, registerSchema);
    const existing = await prisma.user.findUnique({
      where: { email: data.email },
      select: { id: true },
    });
    if (existing) {
      throw new ApiError(409, "EMAIL_IN_USE", "An account with this email already exists.");
    }

    const passwordHash = await bcrypt.hash(data.password, 12);
    const user = await prisma.user.create({
      data: {
        email: data.email,
        name: data.name,
        passwordHash,
        role: "STUDENT",
        status: "ACTIVE",
      },
      select: { id: true, email: true, name: true, createdAt: true },
    });

    await safeRecordAudit({
      actorId: user.id,
      action: "USER_REGISTERED",
      entityType: "User",
      entityId: user.id,
      ipAddress: ip,
    });

    return created(user);
  });
}
