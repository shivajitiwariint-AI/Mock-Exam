import { prisma } from '@/lib/prisma'

export async function calculateHealthScore(userId: number): Promise<number> {
  const today = new Date()
  today.setHours(0, 0, 0, 0)

  const sevenDaysAgo = new Date(today)
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 6)

  const logs = await prisma.healthLog.findMany({
    where: { userId, date: { gte: sevenDaysAgo } },
  })

  if (logs.length === 0) return 0

  const exerciseDays = logs.filter((l) => (l.exerciseMins ?? 0) >= 30).length
  const waterDays = logs.filter((l) => (l.waterGlasses ?? 0) >= 8).length
  const sleepDays = logs.filter((l) => (l.sleepHours ?? 0) >= 7).length

  const exerciseRate = exerciseDays / 7
  const waterRate = waterDays / 7
  const sleepRate = sleepDays / 7

  const final = Math.round(exerciseRate * 40 + waterRate * 30 + sleepRate * 30)
  return Math.max(0, Math.min(100, final))
}
