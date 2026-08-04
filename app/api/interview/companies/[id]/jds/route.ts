export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getUserFromRequest } from '@/lib/auth'
import { createJdSchema } from '@/lib/validations/interview.schema'

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const user = await getUserFromRequest(request)
  const companyId = parseInt(params.id, 10)
  if (isNaN(companyId)) return NextResponse.json({ error: 'Invalid ID' }, { status: 400 })

  const company = await prisma.interviewCompany.findFirst({ where: { id: companyId, userId: user.userId } })
  if (!company) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const jds = await prisma.jobDescription.findMany({
    where: { companyId },
    include: { _count: { select: { questions: true } } },
    orderBy: { createdAt: 'desc' },
  })

  return NextResponse.json({ jds })
}

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const user = await getUserFromRequest(request)
  const companyId = parseInt(params.id, 10)
  if (isNaN(companyId)) return NextResponse.json({ error: 'Invalid ID' }, { status: 400 })

  const company = await prisma.interviewCompany.findFirst({ where: { id: companyId, userId: user.userId } })
  if (!company) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  let body: unknown
  try { body = await request.json() } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const result = createJdSchema.safeParse(body)
  if (!result.success) return NextResponse.json({ error: 'Validation failed' }, { status: 400 })

  const jd = await prisma.jobDescription.create({
    data: { ...result.data, companyId },
    include: { _count: { select: { questions: true } } },
  })

  return NextResponse.json({ jd }, { status: 201 })
}
