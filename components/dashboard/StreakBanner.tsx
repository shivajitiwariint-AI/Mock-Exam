type StreakBannerProps = {
  streak: number
  userName: string
}

export default function StreakBanner({ streak, userName }: StreakBannerProps) {
  const messages: Record<number, string> = {
    0: `Welcome, ${userName}! Start your growth journey today.`,
    1: `Day 1 unlocked — every journey starts here, ${userName}!`,
  }
  const message =
    streak <= 1
      ? messages[streak] ?? `Day ${streak} — Keep going, ${userName}!`
      : `🔥 ${streak}-day streak — Unstoppable, ${userName}!`

  return (
    <div className="mb-6 flex items-center gap-3 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 px-5 py-3 text-white shadow-md">
      <span className="text-2xl">🔥</span>
      <p className="text-sm font-semibold">{message}</p>
    </div>
  )
}
