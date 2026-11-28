export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getUserFromRequest } from '@/lib/auth'
import { updateQuestionSchema } from '@/lib/validations/interview.schema'
import { withApi } from "@/lib/errors";

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  return withApi(async () => {
  const { id } = await params
  const questionId = parseInt(id, 10)
  const user = await getUserFromRequest(request)
  if (isNaN(questionId)) return NextResponse.json({ error: 'Invalid ID' }, { status: 400 })

  const existing = await prisma.interviewBankQuestion.findFirst({ where: { id: questionId, userId: user.userId } })
  if (!existing) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  let body: unknown
  try { body = await request.json() } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const result = updateQuestionSchema.safeParse(body)
  if (!result.success) return NextResponse.json({ error: 'Validation failed' }, { status: 400 })

  const question = await prisma.interviewBankQuestion.update({ where: { id: questionId }, data: result.data })
  return NextResponse.json({ question })

  });
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  return withApi(async () => {
  const { id } = await params
  const questionId = parseInt(id, 10)
  const user = await getUserFromRequest(request)
  if (isNaN(questionId)) return NextResponse.json({ error: 'Invalid ID' }, { status: 400 })

  // Shared question-bank rows are exposed with negative IDs. Archive them
  // instead of hard-deleting so exam and attempt history keeps its references.
  if (questionId < 0) {
    const isAdmin = user.isAdmin === true || user.role === 'SUPER_ADMIN'
    if (!isAdmin) {
      return NextResponse.json({ error: 'Only an admin can remove shared questions.' }, { status: 403 })
    }

    const bankQuestion = await prisma.question.findUnique({ where: { id: -questionId } })
    if (!bankQuestion) return NextResponse.json({ error: 'Not found' }, { status: 404 })

    await prisma.question.update({
      where: { id: bankQuestion.id },
      data: { status: 'ARCHIVED' },
    })
    return NextResponse.json({ success: true })
  }

  const existing = await prisma.interviewBankQuestion.findFirst({ where: { id: questionId, userId: user.userId } })
  if (!existing) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  await prisma.interviewBankQuestion.delete({ where: { id: questionId } })
  return NextResponse.json({ success: true })

  });
}
