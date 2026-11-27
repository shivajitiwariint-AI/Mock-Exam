export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getUserFromRequest } from '@/lib/auth'
import { withApi } from "@/lib/errors";

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  return withApi(async () => {
  const user = await getUserFromRequest(request)
  const id = parseInt(params.id, 10)
  if (isNaN(id)) return NextResponse.json({ error: 'Invalid ID' }, { status: 400 })

  const round = await prisma.interviewRound.findFirst({
    where: { id, experience: { userId: user.userId } },
  })
  if (!round) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  await prisma.interviewRound.delete({ where: { id } })
  return NextResponse.json({ success: true })

  });
}
