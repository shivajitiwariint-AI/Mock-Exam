export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getUserFromRequest } from '@/lib/auth'
import { updateSubtopicSchema } from '@/lib/validations/education.schema'

async function getOwnedSubtopic(subtopicId: number, userId: number) {
  return prisma.subtopic.findFirst({
    where: { id: subtopicId, topic: { subject: { userId } } },
  })
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const user = await getUserFromRequest(request)
  const id = parseInt(params.id, 10)
  if (isNaN(id)) return NextResponse.json({ error: 'Invalid ID' }, { status: 400 })

  const existing = await getOwnedSubtopic(id, user.userId)
  if (!existing) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  let body: unknown
  try { body = await request.json() } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const result = updateSubtopicSchema.safeParse(body)
  if (!result.success) return NextResponse.json({ error: 'Validation failed' }, { status: 400 })

  const subtopic = await prisma.subtopic.update({ where: { id }, data: result.data })
  return NextResponse.json({ subtopic })
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const user = await getUserFromRequest(request)
  const id = parseInt(params.id, 10)
  if (isNaN(id)) return NextResponse.json({ error: 'Invalid ID' }, { status: 400 })

  const existing = await getOwnedSubtopic(id, user.userId)
  if (!existing) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  await prisma.subtopic.delete({ where: { id } })
  return NextResponse.json({ success: true })
}
