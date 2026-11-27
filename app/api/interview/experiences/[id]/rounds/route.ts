export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getUserFromRequest } from '@/lib/auth'
import { createRoundSchema } from '@/lib/validations/interview.schema'
import { withApi } from "@/lib/errors";

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  return withApi(async () => {
  const user = await getUserFromRequest(request)
  const experienceId = parseInt(params.id, 10)
  if (isNaN(experienceId)) return NextResponse.json({ error: 'Invalid ID' }, { status: 400 })

  const exp = await prisma.interviewExperience.findFirst({ where: { id: experienceId, userId: user.userId } })
  if (!exp) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  let body: unknown
  try { body = await request.json() } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const result = createRoundSchema.safeParse(body)
  if (!result.success) return NextResponse.json({ error: 'Validation failed' }, { status: 400 })

  const round = await prisma.interviewRound.create({ data: { ...result.data, experienceId } })
  return NextResponse.json({ round }, { status: 201 })

  });
}
