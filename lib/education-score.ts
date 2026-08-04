import { prisma } from '@/lib/prisma'

export async function calculateEducationScore(userId: number): Promise<number> {
  const results = await prisma.examResult.findMany({
    where: { userId },
    select: { score: true },
  })

  const examScore =
    results.length > 0
      ? results.reduce((sum, r) => sum + r.score, 0) / results.length
      : 0

  const sevenDaysAgo = new Date()
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)

  const recentSessions = await prisma.studySession.findMany({
    where: { userId, createdAt: { gte: sevenDaysAgo } },
    select: { durationMins: true },
  })

  const totalStudyMins = recentSessions.reduce((sum, s) => sum + s.durationMins, 0)
  const studyScore = Math.min((totalStudyMins / 1200) * 100, 100)

  const final = Math.round(examScore * 0.6 + studyScore * 0.4)
  return Math.max(0, Math.min(100, final))
}
