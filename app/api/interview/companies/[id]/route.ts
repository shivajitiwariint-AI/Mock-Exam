export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getUserFromRequest } from '@/lib/auth'
import { updateCompanySchema } from '@/lib/validations/interview.schema'

function parseId(params: { id: string }): number | null {
  const n = parseInt(params.id, 10)
  return isNaN(n) ? null : n
}

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const user = await getUserFromRequest(request)
  const id = parseId(params)
  if (!id) return NextResponse.json({ error: 'Invalid ID' }, { status: 400 })

  const company = await prisma.interviewCompany.findFirst({
    where: { id, userId: user.userId },
    include: {
      jobDescs: {
        include: { _count: { select: { questions: true } } },
        orderBy: { createdAt: 'desc' },
      },
      _count: { select: { questions: true, experiences: true } },
    },
  })

  if (!company) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  return NextResponse.json({ company })
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const user = await getUserFromRequest(request)
  const id = parseId(params)
  if (!id) return NextResponse.json({ error: 'Invalid ID' }, { status: 400 })

  const existing = await prisma.interviewCompany.findFirst({ where: { id, userId: user.userId } })
  if (!existing) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  let body: unknown
  try { body = await request.json() } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const result = updateCompanySchema.safeParse(body)
  if (!result.success) return NextResponse.json({ error: 'Validation failed' }, { status: 400 })

  const company = await prisma.interviewCompany.update({ where: { id }, data: result.data })
  return NextResponse.json({ company })
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const user = await getUserFromRequest(request)
  const id = parseId(params)
  if (!id) return NextResponse.json({ error: 'Invalid ID' }, { status: 400 })

  const existing = await prisma.interviewCompany.findFirst({ where: { id, userId: user.userId } })
  if (!existing) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  await prisma.interviewCompany.delete({ where: { id } })
  return NextResponse.json({ success: true })
}
