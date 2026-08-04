import { NextRequest, NextResponse } from 'next/server'
import { getUserFromRequest } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { updateProfileSchema } from '@/lib/validations/profile.schema'

export async function GET(request: NextRequest) {
  let authUser
  try {
    authUser = await getUserFromRequest(request)
  } catch (err) {
    return err as Response
  }

  const profile = await prisma.userProfile.findUnique({
    where: { userId: authUser.userId },
  })

  if (!profile) {
    return NextResponse.json({ error: 'Profile not found' }, { status: 404 })
  }

  return NextResponse.json({
    id: profile.id,
    name: profile.name,
    avatar: profile.avatar,
    bio: profile.bio,
  })
}

export async function PUT(request: NextRequest) {
  let authUser
  try {
    authUser = await getUserFromRequest(request)
  } catch (err) {
    return err as Response
  }

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const result = updateProfileSchema.safeParse(body)
  if (!result.success) {
    const fields: Record<string, string> = {}
    result.error.issues.forEach((issue) => {
      if (issue.path[0]) fields[String(issue.path[0])] = issue.message
    })
    return NextResponse.json({ error: 'Validation failed', fields }, { status: 400 })
  }

  const updated = await prisma.userProfile.update({
    where: { userId: authUser.userId },
    data: result.data,
  })

  return NextResponse.json({
    id: updated.id,
    name: updated.name,
    avatar: updated.avatar,
    bio: updated.bio,
  })
}
