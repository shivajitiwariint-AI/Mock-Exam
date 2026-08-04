import { prisma } from '@/lib/prisma'

export async function calculateGoalScore(userId: number): Promise<number> {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const todayStr = today.toISOString().split('T')[0]

  // Monday of current week
  const weekStart = new Date(today)
  const day = weekStart.getDay()
  const diff = day === 0 ? -6 : 1 - day
  weekStart.setDate(weekStart.getDate() + diff)
  weekStart.setHours(0, 0, 0, 0)

  const [totalDaily, totalWeekly, completedToday, completedThisWeek] = await Promise.all([
    prisma.goal.count({ where: { userId, type: 'DAILY', status: 'ACTIVE' } }),
    prisma.goal.count({ where: { userId, type: 'WEEKLY', status: 'ACTIVE' } }),
    prisma.goalProgress.count({
      where: {
        userId,
        completed: true,
        date: new Date(todayStr),
        goal: { type: 'DAILY' },
      },
    }),
    prisma.goalProgress.count({
      where: {
        userId,
        completed: true,
        date: { gte: weekStart },
        goal: { type: 'WEEKLY' },
      },
    }),
  ])

  const dailyRate = totalDaily > 0 ? completedToday / totalDaily : 0
  const weeklyRate = totalWeekly > 0 ? completedThisWeek / totalWeekly : 0
  const final = Math.round(dailyRate * 60 + weeklyRate * 40)
  return Math.max(0, Math.min(100, final))
}
