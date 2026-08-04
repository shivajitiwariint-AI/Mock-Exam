export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getUserFromRequest } from '@/lib/auth'
import { createSubtopicSchema } from '@/lib/validations/education.schema'

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const user = await getUserFromRequest(request)
  const topicId = parseInt(params.id, 10)
  if (isNaN(topicId)) return NextResponse.json({ error: 'Invalid ID' }, { status: 400 })

  const topic = await prisma.topic.findFirst({ where: { id: topicId, subject: { userId: user.userId } } })
  if (!topic) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  let body: unknown
  try { body = await request.json() } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const result = createSubtopicSchema.safeParse(body)
  if (!result.success) return NextResponse.json({ error: 'Validation failed' }, { status: 400 })

  const subtopic = await prisma.subtopic.create({ data: { ...result.data, topicId } })
  return NextResponse.json({ subtopic }, { status: 201 })
}
