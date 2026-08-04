export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { getUserFromRequest } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET(request: NextRequest) {
  let authUser
  try {
    authUser = await getUserFromRequest(request)
  } catch (err) {
    return err as Response
  }

  const user = await prisma.user.findUnique({
    where: { id: authUser.userId },
    include: { profile: true },
  })

  if (!user) {
    return NextResponse.json({ error: 'User not found' }, { status: 404 })
  }

  return NextResponse.json({
    id: user.id,
    email: user.email,
    profile: user.profile
      ? {
          id: user.profile.id,
          name: user.profile.name,
          avatar: user.profile.avatar,
          bio: user.profile.bio,
        }
      : null,
  })
}
