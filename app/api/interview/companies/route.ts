export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getUserFromRequest } from '@/lib/auth'
import { createCompanySchema } from '@/lib/validations/interview.schema'

export async function GET(request: NextRequest) {
  const user = await getUserFromRequest(request)

  const companies = await prisma.interviewCompany.findMany({
    where: { userId: user.userId },
    include: {
      _count: { select: { jobDescs: true, questions: true, experiences: true } },
    },
    orderBy: { createdAt: 'desc' },
  })

  return NextResponse.json({ companies })
}

export async function POST(request: NextRequest) {
  const user = await getUserFromRequest(request)

  let body: unknown
  try { body = await request.json() } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const result = createCompanySchema.safeParse(body)
  if (!result.success) return NextResponse.json({ error: 'Validation failed' }, { status: 400 })

  const company = await prisma.interviewCompany.create({
    data: { ...result.data, userId: user.userId },
    include: {
      _count: { select: { jobDescs: true, questions: true, experiences: true } },
    },
  })

  return NextResponse.json({ company }, { status: 201 })
}
