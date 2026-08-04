'use client'

import { useRouter } from 'next/navigation'
import { useTheme } from 'next-themes'
import { useUserStore } from '@/store/useUserStore'

type HeaderProps = {
  title: string
}

export default function Header({ title }: HeaderProps) {
  const router = useRouter()
  const { theme, setTheme } = useTheme()
  const clearUser = useUserStore((s) => s.clearUser)

  const handleLogout = async () => {
    await fetch('/api/auth/logout', { method: 'POST' })
    clearUser()
    router.push('/login')
  }

  return (
    <header className="flex h-16 items-center justify-between border-b border-slate-200 bg-white px-6 dark:border-slate-700 dark:bg-slate-900">
      <h1 className="text-lg font-semibold text-slate-800 dark:text-slate-100">{title}</h1>
      <div className="flex items-center gap-3">
        {/* Theme toggle */}
        <button
          onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
          className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800"
          aria-label="Toggle theme"
        >
          {theme === 'dark' ? '☀️' : '🌙'}
        </button>

        {/* Notifications placeholder */}
        <button className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800">
          🔔
        </button>

        {/* Logout */}
        <button
          onClick={handleLogout}
          className="rounded-lg px-3 py-1.5 text-sm font-medium text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
        >
          Logout
        </button>
      </div>
    </header>
  )
}
