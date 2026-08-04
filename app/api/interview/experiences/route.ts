export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getUserFromRequest } from '@/lib/auth'
import { createExperienceSchema } from '@/lib/validations/interview.schema'

export async function GET(request: NextRequest) {
  const user = await getUserFromRequest(request)

  const experiences = await prisma.interviewExperience.findMany({
    where: { userId: user.userId },
    include: {
      company: { select: { id: true, name: true } },
      rounds: { orderBy: { roundNumber: 'asc' } },
    },
    orderBy: { date: 'desc' },
  })

  return NextResponse.json({ experiences })
}

export async function POST(request: NextRequest) {
  const user = await getUserFromRequest(request)

  let body: unknown
  try { body = await request.json() } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const result = createExperienceSchema.safeParse(body)
  if (!result.success) return NextResponse.json({ error: 'Validation failed' }, { status: 400 })

  const { date, ...rest } = result.data

  const experience = await prisma.interviewExperience.create({
    data: { ...rest, date: new Date(date), userId: user.userId },
    include: {
      company: { select: { id: true, name: true } },
      rounds: true,
    },
  })

  return NextResponse.json({ experience }, { status: 201 })
}
