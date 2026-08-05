export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getAdminFromRequest } from '@/lib/auth'
import { calculateGrowthScore } from '@/lib/growth-score'

export async function GET(request: NextRequest): Promise<NextResponse> {
  await getAdminFromRequest(request)

  const users = await prisma.user.findMany({
    select: {
      id: true,
      email: true,
      isAdmin: true,
      createdAt: true,
      profile: { select: { name: true, avatar: true } },
    },
    orderBy: { createdAt: 'asc' },
  })

  const usersWithScores = await Promise.all(
    users.map(async (u) => {
      const score = await calculateGrowthScore(u.id)
      return { ...u, score }
    })
  )

  return NextResponse.json({ users: usersWithScores })
}

export async function DELETE(request: NextRequest): Promise<NextResponse> {
  const admin = await getAdminFromRequest(request)
  const { searchParams } = new URL(request.url)
  const userId = parseInt(searchParams.get('id') ?? '', 10)

  if (!userId || isNaN(userId)) {
    return NextResponse.json({ error: 'User id required' }, { status: 400 })
  }
  if (userId === admin.userId) {
    return NextResponse.json({ error: 'Cannot delete your own account' }, { status: 400 })
  }

  await prisma.user.delete({ where: { id: userId } })
  return NextResponse.json({ success: true })
}
