export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getUserFromRequest } from '@/lib/auth'
import { toLegacyQuestion } from '@/lib/legacy-education'
import { withApi } from "@/lib/errors";

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  return withApi(async () => {
  const user = await getUserFromRequest(request)
  const id = parseInt(params.id, 10)
  if (isNaN(id)) return NextResponse.json({ error: 'Invalid ID' }, { status: 400 })

  const exam = await prisma.exam.findFirst({
    where: { id, OR: [{ userId: user.userId }, { userId: null }] },
    include: {
      questions: {
        include: {
          question: { include: { answers: { orderBy: { order: 'asc' } } } },
        },
        orderBy: { order: 'asc' },
      },
    },
  })

  if (!exam) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  return NextResponse.json({
    exam: {
      ...exam,
      questions: exam.questions.map((examQuestion) => ({
        ...examQuestion,
        question: toLegacyQuestion(examQuestion.question as unknown as Record<string, unknown>),
      })),
    },
  })

  });
}
