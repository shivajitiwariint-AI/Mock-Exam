import { SignJWT, jwtVerify } from 'jose'
import { NextResponse } from 'next/server'
import type { AuthUser } from '@/types'
import { ApiError } from './errors'
import { getJwtSecret } from './jwt-secret'
import { prisma } from './prisma'

const COOKIE_NAME = 'pgcip_token'

// A short cache keeps the "is this account still active?" check cheap while
// still propagating suspensions/role changes within half a minute.
const USER_CACHE_TTL_MS = 30_000
const userCache = new Map<number, { user: AuthUser; expiresAt: number }>()

function effectiveRole(user: { isAdmin: boolean; role: AuthUser['role'] }): AuthUser['role'] {
  // Legacy PGOS admins were flagged with isAdmin and had no role value.
  return user.isAdmin && user.role === 'STUDENT' ? 'SUPER_ADMIN' : user.role
}

async function loadActiveUser(userId: number): Promise<AuthUser | null> {
  const cached = userCache.get(userId)
  if (cached && cached.expiresAt > Date.now()) return cached.user

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, email: true, role: true, isAdmin: true, status: true },
  })

  if (!user || user.status !== 'ACTIVE') {
    userCache.delete(userId)
    return null
  }

  const authUser: AuthUser = {
    userId: user.id,
    email: user.email,
    isAdmin: user.isAdmin,
    role: effectiveRole(user),
    status: user.status,
  }

  if (userCache.size > 1000) {
    const now = Date.now()
    for (const [key, entry] of userCache) {
      if (entry.expiresAt <= now) userCache.delete(key)
    }
  }
  userCache.set(userId, { user: authUser, expiresAt: Date.now() + USER_CACHE_TTL_MS })
  return authUser
}

export async function signJWT(payload: AuthUser): Promise<string> {
  return new SignJWT({ ...payload })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('7d')
    .sign(getJwtSecret())
}

export async function verifyJWT(token: string): Promise<AuthUser> {
  const { payload } = await jwtVerify(token, getJwtSecret())
  return {
    userId: payload.userId as number,
    email: payload.email as string,
    isAdmin: payload.isAdmin as boolean | undefined,
    role: payload.role as AuthUser['role'],
    status: payload.status as AuthUser['status'],
  }
}

export async function getUserFromRequest(request: Request): Promise<AuthUser> {
  const cookieHeader = request.headers.get('cookie') ?? ''
  const match = cookieHeader.match(new RegExp(`${COOKIE_NAME}=([^;]+)`))
  const token = match?.[1]

  if (!token) {
    throw new ApiError(401, 'UNAUTHORIZED', 'Authentication is required.')
  }

  let payload: AuthUser
  try {
    payload = await verifyJWT(token)
  } catch {
    throw new ApiError(401, 'UNAUTHORIZED', 'Your session has expired. Please sign in again.')
  }

  // Revalidate against the database so deactivated accounts lose access
  // immediately instead of waiting for the 7-day token to expire.
  const user = await loadActiveUser(payload.userId)
  if (!user) {
    throw new ApiError(401, 'UNAUTHORIZED', 'This account is no longer active.')
  }

  return user
}

export async function getAdminFromRequest(request: Request): Promise<AuthUser> {
  const user = await getUserFromRequest(request)
  if (user.role !== 'SUPER_ADMIN' && user.role !== 'SUBJECT_ADMIN' && !user.isAdmin) {
    throw new ApiError(403, 'FORBIDDEN', 'Administrator access is required.')
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
