export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { getClientIp } from '@/lib/api'
import { prisma } from '@/lib/prisma'
import { comparePassword } from '@/lib/password'
import { signJWT, setAuthCookie } from '@/lib/auth'
import { limitOrResponse } from '@/lib/rate-limit'
import { loginSchema } from '@/lib/validations/auth.schema'

export async function POST(request: NextRequest) {
  const ip = getClientIp(request)
  const ipLimited = await limitOrResponse(`auth:login:ip:${ip}`, 30, 60_000)
  if (ipLimited) return ipLimited

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const result = loginSchema.safeParse(body)
  if (!result.success) {
    return NextResponse.json({ error: 'Validation failed' }, { status: 400 })
  }

  const { email, password } = result.data

  const emailLimited = await limitOrResponse(
    `auth:login:email:${email.toLowerCase()}`,
    20,
    15 * 60_000
  )
  if (emailLimited) return emailLimited

  let user
  try {
    user = await prisma.user.findUnique({ where: { email } })
  } catch (err) {
    console.error('[login] db error:', err instanceof Error ? err.message : err)
    return NextResponse.json({ error: 'Service unavailable' }, { status: 503 })
  }

  if (!user) {
    return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 })
  }

  const valid = await comparePassword(password, user.password)
  if (!valid) {
    return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 })
  }

  if (user.status !== 'ACTIVE') {
    return NextResponse.json({ error: 'This account is not active.' }, { status: 403 })
  }

  await prisma.user.update({
    where: { id: user.id },
    data: { lastLoginAt: new Date() },
  })

  const effectiveRole = user.isAdmin && user.role === 'STUDENT' ? 'SUPER_ADMIN' : user.role
  const token = await signJWT({
    userId: user.id,
    email: user.email,
    isAdmin: user.isAdmin,
    role: effectiveRole,
    status: user.status,
  })
  const response = NextResponse.json({ success: true })
  setAuthCookie(response, token)
  return response
}
