export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getUserFromRequest } from '@/lib/auth'
import { createTopicSchema } from '@/lib/validations/education.schema'

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const user = await getUserFromRequest(request)
  const subjectId = parseInt(params.id, 10)
  if (isNaN(subjectId)) return NextResponse.json({ error: 'Invalid ID' }, { status: 400 })

  const subject = await prisma.subject.findFirst({ where: { id: subjectId, userId: user.userId } })
  if (!subject) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const topics = await prisma.topic.findMany({
    where: { subjectId },
    include: { _count: { select: { subtopics: true, questions: true } } },
    orderBy: { order: 'asc' },
  })

  return NextResponse.json({ topics })
}

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const user = await getUserFromRequest(request)
  const subjectId = parseInt(params.id, 10)
  if (isNaN(subjectId)) return NextResponse.json({ error: 'Invalid ID' }, { status: 400 })

  const subject = await prisma.subject.findFirst({ where: { id: subjectId, userId: user.userId } })
  if (!subject) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  let body: unknown
  try { body = await request.json() } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const result = createTopicSchema.safeParse(body)
  if (!result.success) return NextResponse.json({ error: 'Validation failed' }, { status: 400 })

  const topic = await prisma.topic.create({
    data: { ...result.data, subjectId },
    include: { _count: { select: { subtopics: true, questions: true } } },
  })

  return NextResponse.json({ topic }, { status: 201 })
}
