import { prisma } from '@/lib/prisma'
import { calculateGrowthScore } from '@/lib/growth-score'
import { ACHIEVEMENTS } from '@/lib/achievements'

async function isEarned(userId: number, key: string): Promise<boolean> {
  switch (key) {
    case 'edu_first_study':
      return (await prisma.studySession.count({ where: { userId } })) >= 1
    case 'edu_10_sessions':
      return (await prisma.studySession.count({ where: { userId } })) >= 10
    case 'edu_first_exam':
      return (await prisma.examResult.count({ where: { userId } })) >= 1
    case 'edu_exam_90':
      return !!(await prisma.examResult.findFirst({ where: { userId, score: { gte: 90 } } }))
    case 'goals_first_goal':
      return (await prisma.goal.count({ where: { userId } })) >= 1
    case 'goals_completed':
      return !!(await prisma.goalProgress.findFirst({ where: { userId, completed: true } }))
    case 'goals_life_goal':
      return !!(await prisma.goal.findFirst({ where: { userId, type: 'LIFE' } }))
    case 'health_first_log':
      return (await prisma.healthLog.count({ where: { userId } })) >= 1
    case 'health_7_days':
      return (await prisma.healthLog.count({ where: { userId } })) >= 7
    case 'health_exercise': {
      const count = await prisma.healthLog.count({ where: { userId, exerciseMins: { gte: 30 } } })
      return count >= 3
    }
    case 'meditation_first':
      return (await prisma.meditationLog.count({ where: { userId } })) >= 1
    case 'meditation_7_days': {
      const logs = await prisma.meditationLog.findMany({ where: { userId }, select: { date: true } })
      const distinctDays = new Set(logs.map((l) => l.date.toISOString().split('T')[0])).size
      return distinctDays >= 7
    }
    case 'interview_company':
      return (await prisma.interviewCompany.count({ where: { userId } })) >= 1
    case 'interview_10_q':
      return (await prisma.interviewQuestion.count({ where: { userId } })) >= 10
    case 'growth_score_25': {
      const { total } = await calculateGrowthScore(userId)
      return total >= 25
    }
    case 'growth_score_50': {
      const { total } = await calculateGrowthScore(userId)
      return total >= 50
    }
    default:
      return false
  }
}

export async function checkAndAwardAchievements(userId: number): Promise<string[]> {
  const existing = await prisma.userAchievement.findMany({ where: { userId }, select: { key: true } })
  const earnedKeys = new Set(existing.map((a) => a.key))

  const newlyEarned: string[] = []
  for (const def of ACHIEVEMENTS) {
    if (earnedKeys.has(def.key)) continue
    if (await isEarned(userId, def.key)) {
      await prisma.userAchievement.create({ data: { userId, key: def.key } })
      newlyEarned.push(def.key)
    }
  }
  return newlyEarned
}
