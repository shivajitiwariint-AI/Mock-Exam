export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getUserFromRequest } from '@/lib/auth'
import { updateTopicSchema } from '@/lib/validations/education.schema'

async function getOwnedTopic(topicId: number, userId: number) {
  return prisma.topic.findFirst({
    where: { id: topicId, subject: { userId } },
  })
}

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const user = await getUserFromRequest(request)
  const id = parseInt(params.id, 10)
  if (isNaN(id)) return NextResponse.json({ error: 'Invalid ID' }, { status: 400 })

  const topic = await prisma.topic.findFirst({
    where: { id, subject: { userId: user.userId } },
    include: {
      subtopics: { orderBy: { order: 'asc' } },
      _count: { select: { questions: true } },
      subject: { select: { id: true, name: true, color: true, icon: true } },
    },
  })

  if (!topic) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  return NextResponse.json({ topic })
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const user = await getUserFromRequest(request)
  const id = parseInt(params.id, 10)
  if (isNaN(id)) return NextResponse.json({ error: 'Invalid ID' }, { status: 400 })

  const existing = await getOwnedTopic(id, user.userId)
  if (!existing) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  let body: unknown
  try { body = await request.json() } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const result = updateTopicSchema.safeParse(body)
  if (!result.success) return NextResponse.json({ error: 'Validation failed' }, { status: 400 })

  const topic = await prisma.topic.update({ where: { id }, data: result.data })
  return NextResponse.json({ topic })
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const user = await getUserFromRequest(request)
  const id = parseInt(params.id, 10)
  if (isNaN(id)) return NextResponse.json({ error: 'Invalid ID' }, { status: 400 })

  const existing = await getOwnedTopic(id, user.userId)
  if (!existing) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  await prisma.topic.delete({ where: { id } })
  return NextResponse.json({ success: true })
}
