type RateLimitEntry = { count: number; resetAt: number }

const store = new Map<string, RateLimitEntry>()
const WINDOW_MS = 60 * 1000 // 1 minute
const MAX_REQUESTS = 10

export function rateLimit(ip: string): { success: boolean } {
  const now = Date.now()
  const entry = store.get(ip)

  if (!entry || now > entry.resetAt) {
    store.set(ip, { count: 1, resetAt: now + WINDOW_MS })
    return { success: true }
  }

  if (entry.count >= MAX_REQUESTS) {
    return { success: false }
  }

  entry.count++
  return { success: true }
}
