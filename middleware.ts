import { NextRequest, NextResponse } from 'next/server'
import { jwtVerify } from 'jose'
import { getJwtSecret } from '@/lib/jwt-secret'

const COOKIE_NAME = 'pgcip_token'

// Authenticated areas of the merged app. Admins may use these pages too.
const userPaths = [
  '/dashboard',
  '/education',
  '/interview',
  '/interviews',
  '/goals',
  '/health',
  '/meditation',
  '/achievements',
  '/analytics',
  '/coach',
  '/schedule',
  '/exams',
  '/attempts',
  '/history',
  '/study',
  '/exam-dashboard',
]

const adminOnlyPaths = ['/admin']

// Routes that must stay reachable without a session cookie.
const publicApiPrefixes = [
  '/api/auth/login',
  '/api/auth/register',
  '/api/auth/logout',
  '/api/health',
  '/api/cron',
  '/api/admin/merge-subjects',
]

function unauthorized(): NextResponse {
  return NextResponse.json(
    { error: 'Unauthorized' },
    { status: 401, headers: { 'Cache-Control': 'no-store' } },
  )
}

async function verifyToken(token: string) {
  const { payload } = await jwtVerify(token, getJwtSecret())
  return payload
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // Guard the API at the edge so unauthenticated requests get a clean 401
  // instead of reaching route handlers (which would surface a 500).
  if (pathname.startsWith('/api')) {
    const isPublic = publicApiPrefixes.some(
      (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
    )
    if (isPublic) return NextResponse.next()

    const token = request.cookies.get(COOKIE_NAME)?.value
    if (!token) return unauthorized()

    try {
      const payload = await verifyToken(token)
      if (payload.status && payload.status !== 'ACTIVE') return unauthorized()
      return NextResponse.next()
    } catch {
      return unauthorized()
    }
  }

  const isUserOnly = userPaths.some((p) => pathname === p || pathname.startsWith(`${p}/`))
  const isAdminOnly = adminOnlyPaths.some((p) => pathname === p || pathname.startsWith(`${p}/`))

  if (!isUserOnly && !isAdminOnly) return NextResponse.next()

  const token = request.cookies.get(COOKIE_NAME)?.value
  if (!token) {
    return NextResponse.redirect(new URL('/login', request.url))
  }

  try {
    const payload = await verifyToken(token)
    if (payload.status && payload.status !== 'ACTIVE') {
      return NextResponse.redirect(new URL('/login?reason=session_expired', request.url))
    }

    const role = payload.role as 'SUPER_ADMIN' | 'SUBJECT_ADMIN' | 'STUDENT' | undefined
    const isAdmin = role === 'SUPER_ADMIN' || role === 'SUBJECT_ADMIN' || payload.isAdmin === true

    if (isAdminOnly && !isAdmin) {
      return NextResponse.redirect(new URL('/dashboard', request.url))
    }

    return NextResponse.next()
  } catch {
    return NextResponse.redirect(new URL('/login?reason=session_expired', request.url))
  }
}

export const config = {
  matcher: [
    '/dashboard/:path*',
    '/education/:path*',
    '/interview/:path*',
    '/interviews/:path*',
    '/goals/:path*',
    '/health/:path*',
    '/meditation/:path*',
    '/achievements/:path*',
    '/analytics/:path*',
    '/coach/:path*',
    '/schedule/:path*',
    '/exams/:path*',
    '/attempts/:path*',
    '/history/:path*',
    '/study/:path*',
    '/exam-dashboard/:path*',
    '/admin/:path*',
    '/api/:path*',
  ],
}
