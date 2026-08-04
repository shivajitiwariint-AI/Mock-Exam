import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { hashPassword } from '@/lib/password'
import { signJWT, setAuthCookie } from '@/lib/auth'
import { rateLimit } from '@/lib/rate-limit'
import { registerSchema } from '@/lib/validations/auth.schema'

export async function POST(request: NextRequest) {
  const ip = request.headers.get('x-forwarded-for') ?? 'unknown'
  const { success } = rateLimit(ip)
  if (!success) {
    return NextResponse.json(
      { error: 'Too many requests. Try again later.' },
      { status: 429 }
    )
  }

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const result = registerSchema.safeParse(body)
  if (!result.success) {
    const fields: Record<string, string> = {}
    result.error.issues.forEach((issue) => {
      if (issue.path[0]) fields[String(issue.path[0])] = issue.message
    })
    return NextResponse.json({ error: 'Validation failed', fields }, { status: 400 })
  }

  const { name, email, password } = result.data

  const existing = await prisma.user.findUnique({ where: { email } })
  if (existing) {
    return NextResponse.json({ error: 'Email already in use' }, { status: 400 })
  }

  const hashed = await hashPassword(password)

  const user = await prisma.$transaction(async (tx) => {
    const newUser = await tx.user.create({ data: { email, password: hashed } })
    await tx.userProfile.create({ data: { userId: newUser.id, name } })
    return newUser
  })

  const token = await signJWT({ userId: user.id, email: user.email })
  const response = NextResponse.json({ success: true }, { status: 201 })
  setAuthCookie(response, token)
  return response
}
