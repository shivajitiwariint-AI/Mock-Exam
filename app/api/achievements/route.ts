export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { getUserFromRequest } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { checkAndAwardAchievements } from '@/lib/achievement-checker'
import { ACHIEVEMENTS } from '@/lib/achievements'
import type { AchievementData } from '@/types'

export async function GET(request: NextRequest) {
  const user = await getUserFromRequest(request)

  await checkAndAwardAchievements(user.userId)

  const earned = await prisma.userAchievement.findMany({
    where: { userId: user.userId },
  })
  const earnedMap = new Map(earned.map((a) => [a.key, a.earnedAt.toISOString()]))

  const achievements: AchievementData[] = ACHIEVEMENTS.map((def) => ({
    key: def.key,
    label: def.label,
    description: def.description,
    category: def.category,
    icon: def.icon,
    earned: earnedMap.has(def.key),
    earnedAt: earnedMap.get(def.key) ?? null,
  }))

  return NextResponse.json({
    achievements,
    stats: {
      earned: earned.length,
      total: ACHIEVEMENTS.length,
    },
  })
}
