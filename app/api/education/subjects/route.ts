export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getUserFromRequest } from '@/lib/auth'
import { createSubjectSchema } from '@/lib/validations/education.schema'

export async function GET(request: NextRequest) {
  const user = await getUserFromRequest(request)

  const subjects = await prisma.subject.findMany({
    where: { userId: user.userId },
    include: {
      _count: { select: { topics: true, studySessions: true, exams: true } },
    },
    orderBy: { createdAt: 'desc' },
  })

  return NextResponse.json({ subjects })
}

export async function POST(request: NextRequest) {
  const user = await getUserFromRequest(request)

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const result = createSubjectSchema.safeParse(body)
  if (!result.success) {
    return NextResponse.json({ error: 'Validation failed' }, { status: 400 })
  }

  const subject = await prisma.subject.create({
    data: { ...result.data, userId: user.userId },
    include: {
      _count: { select: { topics: true, studySessions: true, exams: true } },
    },
  })

  return NextResponse.json({ subject }, { status: 201 })
}
