export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getUserFromRequest } from '@/lib/auth'
import { upsertHealthLogSchema } from '@/lib/validations/health.schema'
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

  const logs = await prisma.healthLog.findMany({
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
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const result = upsertHealthLogSchema.safeParse(body)
  if (!result.success) {
    return NextResponse.json(
      { error: 'Validation failed', fields: result.error.issues },
      { status: 400 }
    )
  }

  const { date, exerciseMins, sleepHours, waterGlasses, weightKg, notes } = result.data

  const log = await prisma.healthLog.upsert({
    where: { userId_date: { userId: user.userId, date: new Date(date) } },
    create: {
      userId: user.userId,
      date: new Date(date),
      exerciseMins: exerciseMins ?? null,
      sleepHours: sleepHours ?? null,
      waterGlasses: waterGlasses ?? null,
      weightKg: weightKg ?? null,
      notes: notes ?? null,
    },
    update: {
      exerciseMins: exerciseMins ?? null,
      sleepHours: sleepHours ?? null,
      waterGlasses: waterGlasses ?? null,
      weightKg: weightKg ?? null,
      notes: notes ?? null,
    },
  })

  return NextResponse.json({ log }, { status: 201 })

  });
}
