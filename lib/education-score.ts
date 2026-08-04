import { prisma } from '@/lib/prisma'

export async function calculateEducationScore(userId: number): Promise<number> {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const sevenDaysAgo = new Date(today)
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 6)

  const [examStats, studySessions] = await Promise.all([
    prisma.examResult.aggregate({
      where: { userId },
      _avg: { score: true },
    }),
    prisma.studySession.findMany({
      where: { userId, createdAt: { gte: sevenDaysAgo } },
      select: { createdAt: true },
    }),
  ])

  const avgExamScore = examStats._avg.score ?? 0

  const studyDays = new Set(
    studySessions.map((s) => s.createdAt.toISOString().split('T')[0])
  ).size
  const studyConsistency = studyDays / 7

  const final = Math.round(avgExamScore * 0.7 + studyConsistency * 100 * 0.3)
  return Math.max(0, Math.min(100, final))
}
