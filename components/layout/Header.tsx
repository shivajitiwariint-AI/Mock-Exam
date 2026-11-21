'use client'

import { useRouter } from 'next/navigation'
import { useTheme } from 'next-themes'
import { useUserStore } from '@/store/useUserStore'

type HeaderProps = {
  title: string
  onMenuClick?: () => void
}

export default function Header({ title, onMenuClick }: HeaderProps) {
  const router = useRouter()
  const { theme, setTheme } = useTheme()
  const clearUser = useUserStore((s) => s.clearUser)

  const handleLogout = async () => {
    await fetch('/api/auth/logout', { method: 'POST' })
    clearUser()
    router.push('/login')
  }

  return (
    <header className="flex h-14 items-center justify-between gap-2 border-b border-slate-200 bg-white px-3 dark:border-slate-700 dark:bg-slate-900 sm:h-16 sm:px-6">
      <div className="flex min-w-0 items-center gap-2">
        <button
          type="button"
          onClick={onMenuClick}
          aria-label="Open navigation"
          className="rounded-lg p-2 text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800 lg:hidden"
        >
          ☰
        </button>
        <h1 className="truncate text-base font-semibold text-slate-800 dark:text-slate-100 sm:text-lg">{title}</h1>
      </div>
      <div className="flex flex-shrink-0 items-center gap-1 sm:gap-3">
        {/* Theme toggle */}
        <button
          onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
          className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800"
          aria-label="Toggle theme"
        >
          {theme === 'dark' ? '☀️' : '🌙'}
        </button>

        {/* Notifications placeholder */}
        <button className="hidden rounded-lg p-2 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 sm:block">
          🔔
        </button>

        {/* Logout */}
        <button
          onClick={handleLogout}
          aria-label="Logout"
          className="rounded-lg px-2 py-1.5 text-sm font-medium text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800 sm:px-3"
        >
          <span className="sm:hidden">🚪</span>
          <span className="hidden sm:inline">Logout</span>
        </button>
      </div>
    </header>
  )
}
