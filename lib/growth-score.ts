import { calculateCareerScore } from '@/lib/career-score'
import { calculateEducationScore } from '@/lib/education-score'
import { calculateHealthScore } from '@/lib/health-score'
import { calculateInterviewReadinessScore } from '@/lib/interview-readiness-score'
import { calculateMeditationScore } from '@/lib/meditation-score'
import type { GrowthScoreBreakdown } from '@/types'

export type { GrowthScoreBreakdown }

export async function calculateGrowthScore(userId: number): Promise<GrowthScoreBreakdown> {
  const [education, career, interviewReadiness, health, meditation] = await Promise.all([
    calculateEducationScore(userId),
    calculateCareerScore(userId),
    calculateInterviewReadinessScore(userId),
    calculateHealthScore(userId),
    calculateMeditationScore(userId),
  ])

  const total = Math.max(
    0,
    Math.min(
      100,
      Math.round(
        education * 0.35 +
          career * 0.25 +
          interviewReadiness * 0.15 +
          health * 0.15 +
          meditation * 0.1
      )
    )
  )

  return { total, education, career, interviewReadiness, health, meditation }
}
