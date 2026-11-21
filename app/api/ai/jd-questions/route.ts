export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getUserFromRequest } from '@/lib/auth'
import { getClaudeClient } from '@/lib/claude'
import { generateJdQuestionsSchema } from '@/lib/validations/interview.schema'

type ClaudeQuestion = {
  question: string
  category: 'TECHNICAL' | 'BEHAVIORAL' | 'SYSTEM_DESIGN' | 'CODING' | 'HR'
  difficulty: 'EASY' | 'MEDIUM' | 'HARD'
  whyAsked: string
}

export async function POST(request: NextRequest) {
  if (!process.env.ANTHROPIC_API_KEY) {
    return NextResponse.json(
      { error: 'AI features require ANTHROPIC_API_KEY to be configured' },
      { status: 503 }
    )
  }

  const user = await getUserFromRequest(request)

  let body: unknown
  try { body = await request.json() } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const parsed = generateJdQuestionsSchema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: 'Validation failed' }, { status: 400 })

  const { companyId, jdId, userSkills } = parsed.data

  const jd = await prisma.jobDescription.findFirst({
    where: { id: jdId, companyId, company: { userId: user.userId } },
    include: { company: { select: { name: true } } },
  })

  if (!jd) return NextResponse.json({ error: 'Job description not found' }, { status: 404 })

  const skills = Array.isArray(jd.requiredSkills) ? (jd.requiredSkills as string[]).join(', ') : ''

  const prompt = `You are an expert technical interviewer. Based on the following job description for a ${jd.role} role at ${jd.company.name}, generate exactly 12 likely interview questions a candidate should prepare for.

Job Description:
${jd.jdText}

Required Skills: ${skills}
${userSkills ? `Candidate's Current Skills: ${userSkills}` : ''}

Return ONLY a valid JSON array — no markdown fences, no explanation text, just the raw JSON array:
[
  {
    "question": "string (the full interview question)",
    "category": "TECHNICAL|BEHAVIORAL|SYSTEM_DESIGN|CODING|HR",
    "difficulty": "EASY|MEDIUM|HARD",
    "whyAsked": "one sentence explaining why this question is relevant to this JD"
  }
]`

  try {
    const claude = getClaudeClient()
    const response = await claude.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 2048,
      messages: [{ role: 'user', content: prompt }],
    })

    const textContent = response.content.find((c) => c.type === 'text')
    if (!textContent || textContent.type !== 'text') {
      return NextResponse.json({ error: 'No response from AI' }, { status: 502 })
    }

    let aiQuestions: ClaudeQuestion[]
    try {
      aiQuestions = JSON.parse(textContent.text) as ClaudeQuestion[]
    } catch {
      return NextResponse.json({ error: 'AI returned invalid JSON' }, { status: 502 })
    }

    if (!Array.isArray(aiQuestions)) {
      return NextResponse.json({ error: 'AI returned unexpected format' }, { status: 502 })
    }

    const validCategories = ['TECHNICAL', 'BEHAVIORAL', 'SYSTEM_DESIGN', 'CODING', 'HR'] as const
    const validDifficulties = ['EASY', 'MEDIUM', 'HARD'] as const

    const saved = await prisma.$transaction(
      aiQuestions
        .filter((q) => q.question && validCategories.includes(q.category) && validDifficulties.includes(q.difficulty))
        .map((q) =>
          prisma.interviewBankQuestion.create({
            data: {
              userId: user.userId,
              companyId,
              jdId,
              source: 'AI_JD',
              category: q.category,
              question: q.question,
              difficulty: q.difficulty,
              whyAsked: q.whyAsked ?? null,
            },
          })
        )
    )

    return NextResponse.json({ questions: saved, count: saved.length }, { status: 201 })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    return NextResponse.json({ error: `AI generation failed: ${message}` }, { status: 500 })
  }
}
