export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { getUserFromRequest } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { withApi } from "@/lib/errors";

export async function GET(request: NextRequest) {
  return withApi(async () => {
  const user = await getUserFromRequest(request)
  const blocks = await prisma.scheduleBlock.findMany({
    where: { userId: user.userId },
    orderBy: [{ order: 'asc' }, { startTime: 'asc' }],
  })
  return NextResponse.json({ blocks })

  });
}

export async function POST(request: NextRequest) {
  return withApi(async () => {
  const user = await getUserFromRequest(request)
  const body = await request.json() as {
    startTime: string
    endTime: string
    label: string
    category?: string
    color?: string
    order?: number
  }

  if (!body.startTime || !body.endTime || !body.label?.trim()) {
    return NextResponse.json({ error: 'startTime, endTime, and label required' }, { status: 400 })
  }

  const maxOrder = await prisma.scheduleBlock.aggregate({
    where: { userId: user.userId },
    _max: { order: true },
  })

  const block = await prisma.scheduleBlock.create({
    data: {
      userId: user.userId,
      startTime: body.startTime,
      endTime: body.endTime,
      label: body.label.trim(),
      category: body.category ?? null,
      color: body.color ?? null,
      order: body.order ?? (maxOrder._max.order ?? 0) + 1,
    },
  })
  return NextResponse.json({ block }, { status: 201 })

  });
}
