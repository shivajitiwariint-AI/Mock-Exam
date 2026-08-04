export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getUserFromRequest } from '@/lib/auth'
import { createGoalSchema } from '@/lib/validations/goal.schema'

export async function GET(request: NextRequest) {
  const user = await getUserFromRequest(request)
  const { searchParams } = new URL(request.url)

  const type = searchParams.get('type') as string | null
  const status = searchParams.get('status') as string | null
  const parentId = searchParams.get('parentId')

  const goals = await prisma.goal.findMany({
    where: {
      userId: user.userId,
      ...(type ? { type: type as 'LIFE' | 'ANNUAL' | 'MONTHLY' | 'WEEKLY' | 'DAILY' } : {}),
      ...(status ? { status: status as 'ACTIVE' | 'COMPLETED' | 'ARCHIVED' } : {}),
      ...(parentId === 'null' ? { parentId: null } : parentId ? { parentId: parseInt(parentId, 10) } : {}),
    },
    orderBy: [{ order: 'asc' }, { createdAt: 'asc' }],
  })

  return NextResponse.json({ goals })
}

export async function POST(request: NextRequest) {
  const user = await getUserFromRequest(request)

  let body: unknown
  try { body = await request.json() } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const result = createGoalSchema.safeParse(body)
  if (!result.success) return NextResponse.json({ error: 'Validation failed' }, { status: 400 })

  const { targetDate, ...rest } = result.data
  const goal = await prisma.goal.create({
    data: {
      ...rest,
      userId: user.userId,
      ...(targetDate ? { targetDate: new Date(targetDate) } : {}),
    },
  })

  return NextResponse.json({ goal }, { status: 201 })
}
