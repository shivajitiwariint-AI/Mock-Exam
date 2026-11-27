export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getUserFromRequest } from '@/lib/auth'
import { questionWriteData, toLegacyQuestion } from '@/lib/legacy-education'
import { updateQuestionSchema } from '@/lib/validations/education.schema'
import { withApi } from "@/lib/errors";

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  return withApi(async () => {
  const user = await getUserFromRequest(request)
  const id = parseInt(params.id, 10)
  if (isNaN(id)) return NextResponse.json({ error: 'Invalid ID' }, { status: 400 })

  const question = await prisma.question.findFirst({
    where: { id, OR: [{ userId: user.userId }, { userId: null }] },
    include: { answers: { orderBy: { order: 'asc' } } },
  })

  if (!question) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  return NextResponse.json({ question: toLegacyQuestion(question as unknown as Record<string, unknown>) })

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

  const existing = await prisma.question.findFirst({ where: { id, userId: user.userId } })
  if (!existing) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  let body: unknown
  try { body = await request.json() } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const result = updateQuestionSchema.safeParse(body)
  if (!result.success) return NextResponse.json({ error: 'Validation failed' }, { status: 400 })

  const { answers, ...questionData } = result.data

  const question = await prisma.$transaction(async (tx) => {
    await tx.questionAnswer.deleteMany({ where: { questionId: id } })
    return tx.question.update({
      where: { id },
      data: questionWriteData(questionData, answers),
      include: { answers: { orderBy: { order: 'asc' } } },
    })
  })

  return NextResponse.json({ question: toLegacyQuestion(question as unknown as Record<string, unknown>) })

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

  const existing = await prisma.question.findFirst({ where: { id, userId: user.userId } })
  if (!existing) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  await prisma.question.delete({ where: { id } })
  return NextResponse.json({ success: true })

  });
}
