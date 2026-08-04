export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getUserFromRequest } from '@/lib/auth'

export async function GET(request: NextRequest) {
  const user = await getUserFromRequest(request)

  const today = new Date()
  today.setHours(0, 0, 0, 0)

  const log = await prisma.healthLog.findUnique({
    where: { userId_date: { userId: user.userId, date: today } },
  })

  return NextResponse.json({ log: log ?? null })
}
