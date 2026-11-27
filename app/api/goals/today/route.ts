export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getUserFromRequest } from '@/lib/auth'
import { withApi } from "@/lib/errors";

export async function GET(request: NextRequest) {
  return withApi(async () => {
  const user = await getUserFromRequest(request)

  const today = new Date()
  today.setHours(0, 0, 0, 0)

  const goals = await prisma.goal.findMany({
    where: { userId: user.userId, type: 'DAILY', status: 'ACTIVE' },
    include: {
      progress: {
        where: { date: today },
        take: 1,
      },
    },
    orderBy: [{ order: 'asc' }, { createdAt: 'asc' }],
  })

  const result = goals.map((g) => ({
    ...g,
    progress: g.progress[0] ?? null,
  }))

  return NextResponse.json({ goals: result })

  });
}
