import { prisma } from '@/lib/prisma'

export async function calculateInterviewReadinessScore(userId: number): Promise<number> {
  const experienceCount = await prisma.interviewExperience.count({ where: { userId } })
  return Math.min(Math.round((experienceCount / 10) * 100), 100)
}
