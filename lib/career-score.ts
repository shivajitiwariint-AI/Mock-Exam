import { prisma } from '@/lib/prisma'

export async function calculateCareerScore(userId: number): Promise<number> {
  const [experienceCount, questionStats] = await Promise.all([
    prisma.interviewExperience.count({ where: { userId } }),
    prisma.interviewBankQuestion.aggregate({
      where: { userId },
      _count: { id: true },
    }),
  ])

  const totalQuestions = questionStats._count.id
  const practicedCount = await prisma.interviewBankQuestion.count({
    where: { userId, practiced: true },
  })

  const practiceRate = totalQuestions > 0 ? practicedCount / totalQuestions : 0
  const activityScore = Math.min(experienceCount / 10, 1.0) * 100
  const final = Math.round(practiceRate * 100 * 0.6 + activityScore * 0.4)
  return Math.max(0, Math.min(100, final))
}
