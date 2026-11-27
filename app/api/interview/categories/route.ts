export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getUserFromRequest } from '@/lib/auth'
import { z } from 'zod'
import { withApi } from "@/lib/errors";

const createSchema = z.object({
  name: z.string().min(1).max(50),
  color: z.enum(['blue', 'amber', 'green', 'red', 'slate']).default('blue'),
})

export async function GET(request: NextRequest) {
  return withApi(async () => {
  const user = await getUserFromRequest(request)
  const categories = await prisma.interviewCategory.findMany({
    where: { userId: user.userId },
    orderBy: { name: 'asc' },
  })
  return NextResponse.json({ categories })

  });
}

export async function POST(request: NextRequest) {
  return withApi(async () => {
  const user = await getUserFromRequest(request)

  let body: unknown
  try { body = await request.json() } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const result = createSchema.safeParse(body)
  if (!result.success) return NextResponse.json({ error: 'Validation failed' }, { status: 400 })

  const existing = await prisma.interviewCategory.findUnique({
    where: { userId_name: { userId: user.userId, name: result.data.name.toUpperCase().replace(/\s+/g, '_') } },
  })
  if (existing) return NextResponse.json({ error: 'Category already exists' }, { status: 409 })

  const category = await prisma.interviewCategory.create({
    data: {
      userId: user.userId,
      name: result.data.name.toUpperCase().replace(/\s+/g, '_'),
      color: result.data.color,
    },
  })
  return NextResponse.json({ category }, { status: 201 })

  });
}
