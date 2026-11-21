export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getUserFromRequest } from '@/lib/auth'
import { createExamSchema } from '@/lib/validations/education.schema'

export async function GET(request: NextRequest) {
  const user = await getUserFromRequest(request)

  const exams = await prisma.exam.findMany({
    where: { OR: [{ userId: user.userId }, { userId: null }] },
    include: { _count: { select: { questions: true, results: true } } },
    orderBy: { createdAt: 'desc' },
  })

  const examsWithBest = await Promise.all(
    exams.map(async (exam) => {
      const best = await prisma.examResult.findFirst({
        where: { examId: exam.id },
        orderBy: { score: 'desc' },
        select: { score: true },
      })
      return { ...exam, bestScore: best?.score ?? null }
    })
  )

  return NextResponse.json({ exams: examsWithBest })
}

export async function POST(request: NextRequest) {
  const user = await getUserFromRequest(request)

  let body: unknown
  try { body = await request.json() } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const result = createExamSchema.safeParse(body)
  if (!result.success) return NextResponse.json({ error: 'Validation failed' }, { status: 400 })

  const { questionIds, ...examData } = result.data

  const ownedQuestions = await prisma.question.findMany({
    where: { id: { in: questionIds }, userId: user.userId },
    select: { id: true },
  })

  if (ownedQuestions.length !== questionIds.length) {
    return NextResponse.json({ error: 'One or more questions not found' }, { status: 400 })
  }

  const exam = await prisma.exam.create({
    data: {
      ...examData,
      userId: user.userId,
      questions: {
        create: questionIds.map((qId, idx) => ({ questionId: qId, order: idx })),
      },
    },
    include: { _count: { select: { questions: true, results: true } } },
  })

  return NextResponse.json({ exam }, { status: 201 })
}
