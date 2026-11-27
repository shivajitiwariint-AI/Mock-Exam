export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { getUserFromRequest } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { withApi } from "@/lib/errors";

export async function PUT(request: NextRequest, { params }: { params: { id: string } }) {
  return withApi(async () => {
  const user = await getUserFromRequest(request)
  const { id } = await params
  const blockId = parseInt(id, 10)
  const body = await request.json() as {
    startTime?: string; endTime?: string; label?: string
    category?: string; color?: string; order?: number
  }

  const existing = await prisma.scheduleBlock.findFirst({ where: { id: blockId, userId: user.userId } })
  if (!existing) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const block = await prisma.scheduleBlock.update({
    where: { id: blockId },
    data: {
      ...(body.startTime !== undefined && { startTime: body.startTime }),
      ...(body.endTime !== undefined && { endTime: body.endTime }),
      ...(body.label !== undefined && { label: body.label }),
      ...(body.category !== undefined && { category: body.category }),
      ...(body.color !== undefined && { color: body.color }),
      ...(body.order !== undefined && { order: body.order }),
    },
  })
  return NextResponse.json({ block })

  });
}

export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
  return withApi(async () => {
  const user = await getUserFromRequest(request)
  const { id } = await params
  const blockId = parseInt(id, 10)

  const existing = await prisma.scheduleBlock.findFirst({ where: { id: blockId, userId: user.userId } })
  if (!existing) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  await prisma.scheduleBlock.delete({ where: { id: blockId } })
  return NextResponse.json({ success: true })

  });
}
