export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { getUserFromRequest } from '@/lib/auth'
import { calculateGrowthScore } from '@/lib/growth-score'

export async function GET(request: NextRequest) {
  const user = await getUserFromRequest(request)
  const score = await calculateGrowthScore(user.userId)
  return NextResponse.json({ score })
}
