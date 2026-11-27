export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { getUserFromRequest } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { withApi } from "@/lib/errors";

export async function GET(request: NextRequest) {
  return withApi(async () => {
  const user = await getUserFromRequest(request)
  const { searchParams } = new URL(request.url)
  const dateStr = searchParams.get('date')   // YYYY-MM-DD
  const daysStr = searchParams.get('days')   // number of past days for history

  if (daysStr) {
    // Return aggregated stats for past N days
    const days = Math.min(parseInt(daysStr, 10) || 7, 30)
    const since = new Date()
    since.setDate(since.getDate() - days + 1)
    since.setHours(0, 0, 0, 0)

    const logs = await prisma.scheduleLog.findMany({
      where: { userId: user.userId, date: { gte: since } },
      include: { block: { select: { label: true, category: true } } },
    })
    return NextResponse.json({ logs })
  }

  if (!dateStr) return NextResponse.json({ error: 'date required' }, { status: 400 })
  const date = new Date(dateStr)

  const logs = await prisma.scheduleLog.findMany({
    where: { userId: user.userId, date },
    include: { block: { select: { id: true, label: true, category: true, startTime: true, endTime: true } } },
  })
  return NextResponse.json({ logs })

  });
}

export async function POST(request: NextRequest) {
  return withApi(async () => {
  const user = await getUserFromRequest(request)
  const body = await request.json() as { blockId: number; date: string; status: string; note?: string }

  if (!body.blockId || !body.date || !body.status) {
    return NextResponse.json({ error: 'blockId, date, status required' }, { status: 400 })
  }

  const block = await prisma.scheduleBlock.findFirst({ where: { id: body.blockId, userId: user.userId } })
  if (!block) return NextResponse.json({ error: 'Block not found' }, { status: 404 })

  const log = await prisma.scheduleLog.upsert({
    where: { blockId_date: { blockId: body.blockId, date: new Date(body.date) } },
    create: {
      userId: user.userId,
      blockId: body.blockId,
      date: new Date(body.date),
      status: body.status as 'DONE' | 'SKIPPED' | 'PARTIAL',
      note: body.note ?? null,
    },
    update: {
      status: body.status as 'DONE' | 'SKIPPED' | 'PARTIAL',
      note: body.note ?? null,
    },
  })
  return NextResponse.json({ log })

  });
}
