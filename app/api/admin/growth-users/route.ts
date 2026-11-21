import { NextResponse } from "next/server";
import { requireSuperAdmin } from "@/lib/authz";
import { prisma } from "@/lib/db";
import { withApi } from "@/lib/errors";
import { calculateGrowthScore } from "@/lib/growth-score";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  return withApi(async () => {
    await requireSuperAdmin();

    const users = await prisma.user.findMany({
      select: {
        id: true,
        email: true,
        isAdmin: true,
        createdAt: true,
        profile: { select: { name: true, avatar: true } },
      },
      orderBy: { createdAt: "asc" },
    });

    const usersWithScores = await Promise.all(
      users.map(async (user) => ({
        ...user,
        score: await calculateGrowthScore(user.id),
      })),
    );

    return NextResponse.json({ users: usersWithScores });
  });
}

export async function DELETE(request: Request) {
  return withApi(async () => {
    const admin = await requireSuperAdmin();
    const userId = Number(new URL(request.url).searchParams.get("id"));

    if (!Number.isInteger(userId) || userId <= 0) {
      return NextResponse.json({ error: "User id required" }, { status: 400 });
    }
    if (userId === admin.id) {
      return NextResponse.json({ error: "Cannot delete your own account" }, { status: 400 });
    }

    await prisma.user.delete({ where: { id: userId } });
    return NextResponse.json({ success: true });
  });
}
