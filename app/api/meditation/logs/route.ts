export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getUserFromRequest } from '@/lib/auth'
import { createMeditationSchema } from '@/lib/validations/health.schema'
import { withApi } from "@/lib/errors";

export async function GET(request: NextRequest) {
  return withApi(async () => {
  const user = await getUserFromRequest(request)
  const { searchParams } = new URL(request.url)
  const from = searchParams.get('from')
  const to = searchParams.get('to')

  const defaultFrom = new Date()
  defaultFrom.setDate(defaultFrom.getDate() - 29)
  defaultFrom.setHours(0, 0, 0, 0)

  const logs = await prisma.meditationLog.findMany({
    where: {
      userId: user.userId,
      date: {
        gte: from ? new Date(from) : defaultFrom,
        ...(to ? { lte: new Date(to) } : {}),
      },
    },
    orderBy: { date: 'desc' },
  })

  return NextResponse.json({ logs })

  });
}

export async function POST(request: NextRequest) {
  return withApi(async () => {
  const user = await getUserFromRequest(request)

  let body: unknown
  try { body = await request.json() } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const result = createMeditationSchema.safeParse(body)
  if (!result.success) {
    return NextResponse.json({ error: 'Validation failed', fields: result.error.issues }, { status: 400 })
  }

  const { date, durationMins, reflection } = result.data

  const log = await prisma.meditationLog.create({
    data: {
      userId: user.userId,
      date: new Date(date),
      durationMins,
      reflection: reflection ?? null,
    },
  })

  return NextResponse.json({ log }, { status: 201 })

  });
}
