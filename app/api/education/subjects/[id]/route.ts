export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getUserFromRequest } from '@/lib/auth'
import { updateSubjectSchema } from '@/lib/validations/education.schema'

function parseId(params: { id: string }): number | null {
  const id = parseInt(params.id, 10)
  return isNaN(id) ? null : id
}

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const user = await getUserFromRequest(request)
  const id = parseId(params)
  if (!id) return NextResponse.json({ error: 'Invalid ID' }, { status: 400 })

  const subject = await prisma.subject.findFirst({
    where: { id, userId: user.userId },
    include: {
      topics: {
        include: {
          _count: { select: { subtopics: true, questions: true } },
        },
        orderBy: { order: 'asc' },
      },
    },
  })

  if (!subject) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  return NextResponse.json({ subject })
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const user = await getUserFromRequest(request)
  const id = parseId(params)
  if (!id) return NextResponse.json({ error: 'Invalid ID' }, { status: 400 })

  const existing = await prisma.subject.findFirst({ where: { id, userId: user.userId } })
  if (!existing) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const result = updateSubjectSchema.safeParse(body)
  if (!result.success) {
    return NextResponse.json({ error: 'Validation failed' }, { status: 400 })
  }

  const subject = await prisma.subject.update({
    where: { id },
    data: result.data,
  })

  return NextResponse.json({ subject })
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const user = await getUserFromRequest(request)
  const id = parseId(params)
  if (!id) return NextResponse.json({ error: 'Invalid ID' }, { status: 400 })

  const existing = await prisma.subject.findFirst({ where: { id, userId: user.userId } })
  if (!existing) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  await prisma.subject.delete({ where: { id } })

  return NextResponse.json({ success: true })
}
