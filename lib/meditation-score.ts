import { prisma } from '@/lib/prisma'

export async function calculateMeditationScore(userId: number): Promise<number> {
  const today = new Date()
  today.setHours(0, 0, 0, 0)

  const sevenDaysAgo = new Date(today)
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 6)

  const sessions = await prisma.meditationLog.findMany({
    where: { userId, date: { gte: sevenDaysAgo } },
  })

  if (sessions.length === 0) return 0

  const uniqueDays = new Set(
    sessions.map((s) => s.date.toISOString().split('T')[0])
  ).size
  const consistencyRate = uniqueDays / 7
  const totalMins = sessions.reduce((sum, s) => sum + s.durationMins, 0)
  const avgDuration = totalMins / sessions.length
  const durationRate = Math.min(avgDuration / 30, 1)

  const final = Math.round(consistencyRate * 60 + durationRate * 40)
  return Math.max(0, Math.min(100, final))
}
