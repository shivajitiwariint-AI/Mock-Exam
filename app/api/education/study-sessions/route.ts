export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getUserFromRequest } from '@/lib/auth'
import { createStudySessionSchema } from '@/lib/validations/education.schema'

export async function GET(request: NextRequest): Promise<NextResponse> {
  const user = await getUserFromRequest(request)
  const { searchParams } = new URL(request.url)
  const subjectId = searchParams.get('subjectId') ? parseInt(searchParams.get('subjectId')!, 10) : undefined

  const sevenDaysAgo = new Date()
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)

  const sessions = await prisma.studySession.findMany({
    where: {
      userId: user.userId,
      subjectId: { not: null },
      ...(subjectId ? { subjectId } : {}),
    },
    include: {
      subject: { select: { id: true, name: true, color: true, icon: true } },
      topic: { select: { id: true, name: true } },
    },
    orderBy: { createdAt: 'desc' },
  })

  const weeklyMins = sessions
    .filter((s) => s.createdAt >= sevenDaysAgo)
    .reduce((sum, s) => sum + s.durationMins, 0)
  const totalMins = sessions.reduce((sum, s) => sum + s.durationMins, 0)

  return NextResponse.json({ sessions, totalMins, weeklyMins })
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  const user = await getUserFromRequest(request)

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const result = createStudySessionSchema.safeParse(body)
  if (!result.success) {
    return NextResponse.json({ error: 'Validation failed' }, { status: 400 })
  }

  const session = await prisma.studySession.create({
    data: { ...result.data, userId: user.userId },
    include: {
      subject: { select: { id: true, name: true, color: true, icon: true } },
      topic: { select: { id: true, name: true } },
    },
  })

  return NextResponse.json({ session }, { status: 201 })
}
