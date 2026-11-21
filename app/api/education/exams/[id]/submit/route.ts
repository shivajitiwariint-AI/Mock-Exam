export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getUserFromRequest } from '@/lib/auth'
import { submitExamSchema } from '@/lib/validations/education.schema'

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const user = await getUserFromRequest(request)
  const examId = parseInt(params.id, 10)
  if (isNaN(examId)) return NextResponse.json({ error: 'Invalid ID' }, { status: 400 })

  const exam = await prisma.exam.findFirst({
    where: { id: examId, OR: [{ userId: user.userId }, { userId: null }] },
    include: {
      questions: {
        include: {
          question: { include: { answers: true } },
        },
        orderBy: { order: 'asc' },
      },
    },
  })

  if (!exam) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  let body: unknown
  try { body = await request.json() } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const parsed = submitExamSchema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: 'Validation failed' }, { status: 400 })

  const { answers: submittedAnswers, timeTaken } = parsed.data
  const totalQ = exam.questions.length
  let correctQ = 0

  for (const eq of exam.questions) {
    const q = eq.question
    if (q.type === 'SHORT_ANSWER') {
      correctQ++
    } else {
      const correctAnswer = q.answers.find((a) => a.isCorrect)
      const submitted = submittedAnswers[String(q.id)]
      if (correctAnswer && submitted && String(correctAnswer.id) === submitted) {
        correctQ++
      }
    }
  }

  const score = totalQ > 0 ? Math.round((correctQ / totalQ) * 100) : 0

  const result = await prisma.examResult.create({
    data: {
      examId,
      userId: user.userId,
      score,
      totalQ,
      correctQ,
      timeTaken: timeTaken ?? null,
      answers: submittedAnswers,
    },
  })

  return NextResponse.json({ result }, { status: 201 })
}
