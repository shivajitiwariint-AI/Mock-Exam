export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getUserFromRequest } from '@/lib/auth'
import { questionWriteData, toLegacyQuestion } from '@/lib/legacy-education'
import { createQuestionSchema } from '@/lib/validations/education.schema'
import { withApi } from "@/lib/errors";

export async function GET(request: NextRequest) {
  return withApi(async () => {
  const user = await getUserFromRequest(request)
  const { searchParams } = new URL(request.url)
  const topicId = searchParams.get('topicId') ? parseInt(searchParams.get('topicId')!, 10) : undefined
  const difficulty = searchParams.get('difficulty') as 'EASY' | 'MEDIUM' | 'HARD' | null
  const type = searchParams.get('type') as 'MCQ' | 'TRUE_FALSE' | 'SHORT_ANSWER' | null

  const questions = await prisma.question.findMany({
    where: {
      OR: [{ userId: user.userId }, { userId: null }],
      ...(topicId ? { topicId } : {}),
      ...(difficulty ? { difficulty } : {}),
      ...(type ? { type } : {}),
    },
    include: { answers: { orderBy: { order: 'asc' } } },
    orderBy: { createdAt: 'desc' },
  })

  return NextResponse.json({ questions: questions.map(toLegacyQuestion) })

  });
}

export async function POST(request: NextRequest) {
  return withApi(async () => {
  const user = await getUserFromRequest(request)

  let body: unknown
  try { body = await request.json() } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const result = createQuestionSchema.safeParse(body)
  if (!result.success) return NextResponse.json({ error: 'Validation failed' }, { status: 400 })

  const { answers, ...questionData } = result.data
  const question = await prisma.question.create({
    data: {
      ...questionWriteData(questionData, answers),
      userId: user.userId,
      status: 'APPROVED',
      source: 'MANUAL',
    },
    include: { answers: { orderBy: { order: 'asc' } } },
  })

  return NextResponse.json({ question: toLegacyQuestion(question as unknown as Record<string, unknown>) }, { status: 201 })

  });
}
