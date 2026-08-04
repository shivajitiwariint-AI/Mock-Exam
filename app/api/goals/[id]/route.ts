export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getUserFromRequest } from '@/lib/auth'
import { updateGoalSchema } from '@/lib/validations/goal.schema'

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const user = await getUserFromRequest(request)
  const id = parseInt(params.id, 10)
  if (isNaN(id)) return NextResponse.json({ error: 'Invalid ID' }, { status: 400 })

  const goal = await prisma.goal.findFirst({
    where: { id, userId: user.userId },
    include: {
      children: { orderBy: [{ order: 'asc' }, { createdAt: 'asc' }] },
      progress: { orderBy: { date: 'desc' }, take: 7 },
    },
  })

  if (!goal) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  return NextResponse.json({ goal })
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const user = await getUserFromRequest(request)
  const id = parseInt(params.id, 10)
  if (isNaN(id)) return NextResponse.json({ error: 'Invalid ID' }, { status: 400 })

  const existing = await prisma.goal.findFirst({ where: { id, userId: user.userId } })
  if (!existing) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  let body: unknown
  try { body = await request.json() } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const result = updateGoalSchema.safeParse(body)
  if (!result.success) return NextResponse.json({ error: 'Validation failed' }, { status: 400 })

  const { targetDate, ...rest } = result.data
  const goal = await prisma.goal.update({
    where: { id },
    data: {
      ...rest,
      ...(targetDate !== undefined ? { targetDate: targetDate ? new Date(targetDate) : null } : {}),
    },
  })

  return NextResponse.json({ goal })
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const user = await getUserFromRequest(request)
  const id = parseInt(params.id, 10)
  if (isNaN(id)) return NextResponse.json({ error: 'Invalid ID' }, { status: 400 })

  const existing = await prisma.goal.findFirst({ where: { id, userId: user.userId } })
  if (!existing) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  await prisma.goal.delete({ where: { id } })
  return NextResponse.json({ success: true })
}
