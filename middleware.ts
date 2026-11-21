import { NextRequest, NextResponse } from 'next/server'
import { jwtVerify } from 'jose'

const COOKIE_NAME = 'pgcip_token'
const secret = new TextEncoder().encode(
  process.env.JWT_SECRET ?? 'fallback-secret-not-for-production'
)

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

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl
  const isUserOnly = userPaths.some((p) => pathname === p || pathname.startsWith(`${p}/`))
  const isAdminOnly = adminOnlyPaths.some((p) => pathname === p || pathname.startsWith(`${p}/`))

  if (!isUserOnly && !isAdminOnly) return NextResponse.next()

  const token = request.cookies.get(COOKIE_NAME)?.value
  if (!token) {
    return NextResponse.redirect(new URL('/login', request.url))
  }

  try {
    const { payload } = await jwtVerify(token, secret)
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
  ],
}
