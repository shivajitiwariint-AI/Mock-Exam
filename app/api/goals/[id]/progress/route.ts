export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getUserFromRequest } from '@/lib/auth'
import { progressSchema } from '@/lib/validations/goal.schema'

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const user = await getUserFromRequest(request)
  const goalId = parseInt(params.id, 10)
  if (isNaN(goalId)) return NextResponse.json({ error: 'Invalid ID' }, { status: 400 })

  const goal = await prisma.goal.findFirst({ where: { id: goalId, userId: user.userId } })
  if (!goal) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  let body: unknown
  try { body = await request.json() } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const result = progressSchema.safeParse(body)
  if (!result.success) return NextResponse.json({ error: 'Validation failed' }, { status: 400 })

  const { date, completed, notes } = result.data

  const progress = await prisma.goalProgress.upsert({
    where: { goalId_date: { goalId, date: new Date(date) } },
    create: { goalId, userId: user.userId, date: new Date(date), completed, notes: notes ?? null },
    update: { completed, notes: notes ?? null },
  })

  return NextResponse.json({ progress })
}
