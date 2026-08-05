import { NextRequest, NextResponse } from 'next/server'
import { jwtVerify } from 'jose'

const COOKIE_NAME = 'pgcip_token'
const secret = new TextEncoder().encode(
  process.env.JWT_SECRET ?? 'fallback-secret-not-for-production'
)

// Routes only regular users can access (admins get redirected to /admin)
const userOnlyPaths = [
  '/dashboard',
  '/education',
  '/interview',
  '/goals',
  '/health',
  '/meditation',
  '/achievements',
  '/analytics',
  '/coach',
  '/schedule',
]

// Routes only admins can access (non-admins get redirected to /dashboard)
const adminOnlyPaths = ['/admin']

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl
  const isUserOnly = userOnlyPaths.some((p) => pathname.startsWith(p))
  const isAdminOnly = adminOnlyPaths.some((p) => pathname.startsWith(p))

  if (!isUserOnly && !isAdminOnly) return NextResponse.next()

  const token = request.cookies.get(COOKIE_NAME)?.value
  if (!token) {
    return NextResponse.redirect(new URL('/login?reason=session_expired', request.url))
  }

  try {
    const { payload } = await jwtVerify(token, secret)
    const isAdmin = payload.isAdmin === true

    // Admin visiting a user-only page → send to /admin
    if (isUserOnly && isAdmin) {
      return NextResponse.redirect(new URL('/admin', request.url))
    }

    // Regular user visiting an admin-only page → send to /dashboard
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
    '/goals/:path*',
    '/health/:path*',
    '/meditation/:path*',
    '/achievements/:path*',
    '/analytics/:path*',
    '/coach/:path*',
    '/schedule/:path*',
    '/admin/:path*',
  ],
}
