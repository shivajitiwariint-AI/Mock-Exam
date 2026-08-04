export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getUserFromRequest } from '@/lib/auth'
import { createQuestionSchema } from '@/lib/validations/interview.schema'

export async function GET(request: NextRequest) {
  const user = await getUserFromRequest(request)
  const { searchParams } = new URL(request.url)

  const companyId = searchParams.get('companyId') ? parseInt(searchParams.get('companyId')!, 10) : undefined
  const jdId = searchParams.get('jdId') ? parseInt(searchParams.get('jdId')!, 10) : undefined
  const category = searchParams.get('category') as string | null
  const practiced = searchParams.get('practiced')

  const questions = await prisma.interviewQuestion.findMany({
    where: {
      userId: user.userId,
      ...(companyId ? { companyId } : {}),
      ...(jdId ? { jdId } : {}),
      ...(category ? { category: category as 'TECHNICAL' | 'BEHAVIORAL' | 'SYSTEM_DESIGN' | 'CODING' | 'HR' } : {}),
      ...(practiced === 'true' ? { practiced: true } : practiced === 'false' ? { practiced: false } : {}),
    },
    include: {
      company: { select: { id: true, name: true } },
      jd: { select: { id: true, role: true } },
    },
    orderBy: { createdAt: 'desc' },
  })

  return NextResponse.json({ questions })
}

export async function POST(request: NextRequest) {
  const user = await getUserFromRequest(request)

  let body: unknown
  try { body = await request.json() } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const result = createQuestionSchema.safeParse(body)
  if (!result.success) return NextResponse.json({ error: 'Validation failed' }, { status: 400 })

  const question = await prisma.interviewQuestion.create({
    data: { ...result.data, userId: user.userId, source: 'MANUAL' },
  })

  return NextResponse.json({ question }, { status: 201 })
}
