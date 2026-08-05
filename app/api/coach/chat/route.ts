export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { getUserFromRequest } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { calculateGrowthScore } from '@/lib/growth-score'
import Anthropic from '@anthropic-ai/sdk'

type ChatMessage = { role: 'user' | 'assistant'; content: string }

// Models to try in order (newest first, fall back to older on 400/404)
const CLAUDE_MODELS = [
  'claude-haiku-4-5-20251001',
  'claude-3-5-haiku-20241022',
  'claude-3-haiku-20240307',
]

// 1st: Anthropic (Claude) via official SDK
async function tryAnthropic(
  systemPrompt: string,
  history: ChatMessage[],
  message: string,
): Promise<string | null> {
  const apiKey = process.env.ANTHROPIC_API_KEY
  if (!apiKey) return null
  const client = new Anthropic({ apiKey })
  for (const model of CLAUDE_MODELS) {
    try {
      const res = await client.messages.create({
        model,
        max_tokens: 512,
        system: systemPrompt,
        messages: [...history, { role: 'user', content: message }],
      })
      const block = res.content[0]
      if (block.type === 'text') return block.text
    } catch (err) {
      const code = (err as { status?: number })?.status
      if (code === 400 || code === 404) continue  // bad model, try next
      console.warn('[AI Coach] Anthropic failed (status %d), trying Ollama…', code)
      return null
    }
  }
  console.warn('[AI Coach] All Claude models failed, trying Ollama…')
  return null
}

// 2nd: Ollama (local LLM)
async function tryOllama(
  systemPrompt: string,
  history: ChatMessage[],
  message: string,
): Promise<string | null> {
  const ollamaUrl = process.env.OLLAMA_URL ?? 'http://localhost:11434'
  const model = process.env.OLLAMA_MODEL ?? 'llama3.2'
  try {
    const res = await fetch(`${ollamaUrl}/api/chat`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        model,
        stream: false,
        options: { num_gpu: 0 },   // CPU-only — avoids Vulkan OOM on systems with limited VRAM
        messages: [
          { role: 'system', content: systemPrompt },
          ...history,
          { role: 'user', content: message },
        ],
      }),
      signal: AbortSignal.timeout(30_000),
    })
    if (!res.ok) {
      console.warn('[AI Coach] Ollama responded %d, falling back to mock', res.status)
      return null
    }
    const data = (await res.json()) as { message?: { content?: string } }
    return data.message?.content ?? null
  } catch (err) {
    console.warn('[AI Coach] Ollama unreachable (%s), using mock', (err as Error).message)
    return null
  }
}

// 3rd: keyword mock (always works, no external deps)
function mockReply(
  message: string,
  score: { total: number; health: number; meditation: number; education: number; career: number; interviewReadiness: number },
  achievementCount: number,
): string {
  const m = message.toLowerCase()
  if (m.includes('health'))
    return `Your Health score is ${score.health}/100. Aim for 30+ minutes of exercise, 8 glasses of water, and 7+ hours of sleep at least 5 days a week.`
  if (m.includes('meditation') || m.includes('mindful'))
    return `Your Meditation score is ${score.meditation}/100. Daily short sessions beat occasional long ones — try 10 minutes tomorrow morning to keep your streak going.`
  if (m.includes('education') || m.includes('study') || m.includes('learn'))
    return `Your Education score is ${score.education}/100. Log a study session and try a quick exam to start moving that number. Even 20 focused minutes counts.`
  if (m.includes('goal'))
    return `Create a Life Goal to anchor your direction, then break it into Daily goals you can check off. Completing daily goals directly feeds your overall score.`
  if (m.includes('interview') || m.includes('career') || m.includes('job'))
    return `Your Career score is ${score.career}/100. Add your first target company and paste in practice questions — that alone moves the needle significantly.`
  if (m.includes('achievement'))
    return `You've earned ${achievementCount} of 16 achievements so far. Keep logging across all modules to unlock more!`
  return `Your Growth Score is ${score.total}/100. Strongest areas: Health (${score.health}) and Meditation (${score.meditation}). Ask me about any specific module for a concrete next step!`
}

export async function POST(request: NextRequest) {
  const user = await getUserFromRequest(request)

  const body = await request.json()
  const { message, history } = body as { message: string; history: ChatMessage[] }

  if (!message || typeof message !== 'string') {
    return NextResponse.json({ error: 'message required' }, { status: 400 })
  }

  const [score, earned] = await Promise.all([
    calculateGrowthScore(user.userId),
    prisma.userAchievement.findMany({ where: { userId: user.userId }, select: { key: true } }),
  ])

  const systemPrompt = `You are an AI growth coach for PGCIP — a Personal Growth & Career Intelligence Platform.

Current user scores:
- Overall Growth Score: ${score.total}/100
- Education: ${score.education}/100
- Career (Interview): ${score.career}/100
- Interview Readiness: ${score.interviewReadiness}/100
- Health: ${score.health}/100
- Meditation: ${score.meditation}/100
- Achievements earned: ${earned.length} / 16

Be encouraging, specific, and actionable. Reference the user's actual scores when relevant. Suggest one concrete next step. Keep responses to 2–4 sentences unless more detail is requested.`

  // Priority: Anthropic → Ollama → mock
  const reply =
    (await tryAnthropic(systemPrompt, history, message)) ??
    (await tryOllama(systemPrompt, history, message)) ??
    mockReply(message, score, earned.length)

  return NextResponse.json({ reply })
}
