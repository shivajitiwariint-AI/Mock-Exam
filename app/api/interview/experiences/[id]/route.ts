export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getUserFromRequest } from '@/lib/auth'
import { updateExperienceSchema } from '@/lib/validations/interview.schema'

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const user = await getUserFromRequest(request)
  const id = parseInt(params.id, 10)
  if (isNaN(id)) return NextResponse.json({ error: 'Invalid ID' }, { status: 400 })

  const experience = await prisma.interviewExperience.findFirst({
    where: { id, userId: user.userId },
    include: {
      company: { select: { id: true, name: true } },
      rounds: { orderBy: { roundNumber: 'asc' } },
    },
  })

  if (!experience) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  return NextResponse.json({ experience })
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const user = await getUserFromRequest(request)
  const id = parseInt(params.id, 10)
  if (isNaN(id)) return NextResponse.json({ error: 'Invalid ID' }, { status: 400 })

  const existing = await prisma.interviewExperience.findFirst({ where: { id, userId: user.userId } })
  if (!existing) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  let body: unknown
  try { body = await request.json() } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const result = updateExperienceSchema.safeParse(body)
  if (!result.success) return NextResponse.json({ error: 'Validation failed' }, { status: 400 })

  const { date, ...rest } = result.data
  const experience = await prisma.interviewExperience.update({
    where: { id },
    data: { ...rest, ...(date ? { date: new Date(date) } : {}) },
  })

  return NextResponse.json({ experience })
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const user = await getUserFromRequest(request)
  const id = parseInt(params.id, 10)
  if (isNaN(id)) return NextResponse.json({ error: 'Invalid ID' }, { status: 400 })

  const existing = await prisma.interviewExperience.findFirst({ where: { id, userId: user.userId } })
  if (!existing) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  await prisma.interviewExperience.delete({ where: { id } })
  return NextResponse.json({ success: true })
}
