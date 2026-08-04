import { NextRequest, NextResponse } from 'next/server'
import { jwtVerify } from 'jose'

const COOKIE_NAME = 'pgcip_token'
const secret = new TextEncoder().encode(
  process.env.JWT_SECRET ?? 'fallback-secret-not-for-production'
)

const protectedPaths = [
  '/dashboard',
  '/education',
  '/interview',
  '/goals',
  '/health',
  '/meditation',
  '/achievements',
  '/analytics',
]

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl
  const isProtected = protectedPaths.some((p) => pathname.startsWith(p))

  if (!isProtected) return NextResponse.next()

  const token = request.cookies.get(COOKIE_NAME)?.value

  if (!token) {
    return NextResponse.redirect(new URL('/login?reason=session_expired', request.url))
  }

  try {
    await jwtVerify(token, secret)
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
  ],
}
