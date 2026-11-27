export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getUserFromRequest } from '@/lib/auth'
import { updateHealthLogSchema } from '@/lib/validations/health.schema'
import { withApi } from "@/lib/errors";

export async function PUT(request: NextRequest, { params }: { params: { id: string } }) {
  return withApi(async () => {
  const user = await getUserFromRequest(request)
  const id = parseInt(params.id, 10)
  if (isNaN(id)) return NextResponse.json({ error: 'Invalid id' }, { status: 400 })

  const existing = await prisma.healthLog.findFirst({ where: { id, userId: user.userId } })
  if (!existing) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const result = updateHealthLogSchema.safeParse(body)
  if (!result.success) {
    return NextResponse.json(
      { error: 'Validation failed', fields: result.error.issues },
      { status: 400 }
    )
  }

  const log = await prisma.healthLog.update({ where: { id }, data: result.data })
  return NextResponse.json({ log })

  });
}

export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
  return withApi(async () => {
  const user = await getUserFromRequest(request)
  const id = parseInt(params.id, 10)
  if (isNaN(id)) return NextResponse.json({ error: 'Invalid id' }, { status: 400 })

  const existing = await prisma.healthLog.findFirst({ where: { id, userId: user.userId } })
  if (!existing) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  await prisma.healthLog.delete({ where: { id } })
  return NextResponse.json({})

  });
}
