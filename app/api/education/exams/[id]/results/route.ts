export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getUserFromRequest } from '@/lib/auth'

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const user = await getUserFromRequest(request)
  const examId = parseInt(params.id, 10)
  if (isNaN(examId)) return NextResponse.json({ error: 'Invalid ID' }, { status: 400 })

  const exam = await prisma.exam.findFirst({
    where: { id: examId, OR: [{ userId: user.userId }, { userId: null }] },
  })
  if (!exam) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const results = await prisma.examResult.findMany({
    where: { examId, userId: user.userId },
    orderBy: { createdAt: 'desc' },
  })

  return NextResponse.json({ results })
}
