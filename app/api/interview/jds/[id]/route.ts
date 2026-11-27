export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getUserFromRequest } from '@/lib/auth'
import { updateJdSchema } from '@/lib/validations/interview.schema'
import { withApi } from "@/lib/errors";

async function getOwnedJd(jdId: number, userId: number) {
  return prisma.jobDescription.findFirst({
    where: { id: jdId, company: { userId } },
  })
}

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  return withApi(async () => {
  const user = await getUserFromRequest(request)
  const id = parseInt(params.id, 10)
  if (isNaN(id)) return NextResponse.json({ error: 'Invalid ID' }, { status: 400 })

  const jd = await prisma.jobDescription.findFirst({
    where: { id, company: { userId: user.userId } },
    include: {
      questions: { orderBy: { createdAt: 'desc' } },
      company: { select: { id: true, name: true } },
    },
  })

  if (!jd) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  return NextResponse.json({ jd })

  });
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  return withApi(async () => {
  const user = await getUserFromRequest(request)
  const id = parseInt(params.id, 10)
  if (isNaN(id)) return NextResponse.json({ error: 'Invalid ID' }, { status: 400 })

  const existing = await getOwnedJd(id, user.userId)
  if (!existing) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  let body: unknown
  try { body = await request.json() } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const result = updateJdSchema.safeParse(body)
  if (!result.success) return NextResponse.json({ error: 'Validation failed' }, { status: 400 })

  const jd = await prisma.jobDescription.update({ where: { id }, data: result.data })
  return NextResponse.json({ jd })

  });
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  return withApi(async () => {
  const user = await getUserFromRequest(request)
  const id = parseInt(params.id, 10)
  if (isNaN(id)) return NextResponse.json({ error: 'Invalid ID' }, { status: 400 })

  const existing = await getOwnedJd(id, user.userId)
  if (!existing) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  await prisma.jobDescription.delete({ where: { id } })
  return NextResponse.json({ success: true })

  });
}
