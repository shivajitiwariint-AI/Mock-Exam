export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { getUserFromRequest } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { getClaudeClient } from '@/lib/claude'
import { calculateGrowthScore } from '@/lib/growth-score'

export async function POST(request: NextRequest) {
  const user = await getUserFromRequest(request)

  const body = await request.json()
  const { message, history } = body as {
    message: string
    history: Array<{ role: 'user' | 'assistant'; content: string }>
  }

  if (!message || typeof message !== 'string') {
    return NextResponse.json({ error: 'message required' }, { status: 400 })
  }

  const [score, earnedAchievements] = await Promise.all([
    calculateGrowthScore(user.userId),
    prisma.userAchievement.findMany({ where: { userId: user.userId }, select: { key: true } }),
  ])

  const systemPrompt = `You are an AI growth coach for PGCIP — a Personal Growth & Career Intelligence Platform. You help users improve across five life areas: Education, Career, Health, Meditation, and Interview Readiness.

Current user scores:
- Overall Growth Score: ${score.total}/100
- Education: ${score.education}/100
- Career: ${score.career}/100
- Interview Readiness: ${score.interviewReadiness}/100
- Health: ${score.health}/100
- Meditation: ${score.meditation}/100
- Achievements earned: ${earnedAchievements.length} of 16

Be encouraging, specific, and actionable. Reference the user's actual scores when relevant. Identify their weakest area and suggest one concrete next step. Keep responses concise (2–4 sentences) unless the user asks for more detail. Never repeat the scores back verbatim unless asked.`

  const anthropic = getClaudeClient()
  const response = await anthropic.messages.create({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 1024,
    system: systemPrompt,
    messages: [...history, { role: 'user', content: message }],
  })

  const reply = (response.content[0] as { type: 'text'; text: string }).text

  return NextResponse.json({ reply })
}
