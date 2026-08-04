export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getUserFromRequest } from '@/lib/auth'

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const user = await getUserFromRequest(request)
  const id = parseInt(params.id, 10)
  if (isNaN(id)) return NextResponse.json({ error: 'Invalid ID' }, { status: 400 })

  const exam = await prisma.exam.findFirst({
    where: { id, userId: user.userId },
    include: {
      questions: {
        include: {
          question: { include: { answers: { orderBy: { order: 'asc' } } } },
        },
        orderBy: { order: 'asc' },
      },
    },
  })

  if (!exam) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  return NextResponse.json({ exam })
}
