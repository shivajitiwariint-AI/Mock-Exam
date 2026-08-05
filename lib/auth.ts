import { SignJWT, jwtVerify } from 'jose'
import { NextResponse } from 'next/server'
import type { AuthUser } from '@/types'

const COOKIE_NAME = 'pgcip_token'
const secret = new TextEncoder().encode(
  process.env.JWT_SECRET ?? 'fallback-secret-not-for-production'
)

export async function signJWT(payload: AuthUser): Promise<string> {
  return new SignJWT({ ...payload })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('7d')
    .sign(secret)
}

export async function verifyJWT(token: string): Promise<AuthUser> {
  const { payload } = await jwtVerify(token, secret)
  return { userId: payload.userId as number, email: payload.email as string, isAdmin: payload.isAdmin as boolean | undefined }
}

export async function getUserFromRequest(request: Request): Promise<AuthUser> {
  const cookieHeader = request.headers.get('cookie') ?? ''
  const match = cookieHeader.match(new RegExp(`${COOKIE_NAME}=([^;]+)`))
  const token = match?.[1]

  if (!token) {
    throw new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  try {
    return await verifyJWT(token)
  } catch {
    throw new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    })
  }
}

export async function getAdminFromRequest(request: Request): Promise<AuthUser> {
  const user = await getUserFromRequest(request)
  if (!user.isAdmin) {
    throw new Response(JSON.stringify({ error: 'Forbidden' }), {
      status: 403,
      headers: { 'Content-Type': 'application/json' },
    })
  }
  return user
}

export function setAuthCookie(response: NextResponse, token: string): void {
  response.cookies.set(COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 60 * 60 * 24 * 7, // 7 days
    path: '/',
  })
}

export function clearAuthCookie(response: NextResponse): void {
  response.cookies.set(COOKIE_NAME, '', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 0,
    path: '/',
  })
}
