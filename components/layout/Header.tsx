'use client'

import { useRouter } from 'next/navigation'
import { useUserStore } from '@/store/useUserStore'

type HeaderProps = {
  title: string
  onMenuClick?: () => void
}

export default function Header({ title, onMenuClick }: HeaderProps) {
  const router = useRouter()
  const clearUser = useUserStore((s) => s.clearUser)

  const handleLogout = async () => {
    await fetch('/api/auth/logout', { method: 'POST' })
    clearUser()
    router.push('/login')
  }

  return (
    <header className="flex h-14 items-center justify-between gap-2 border-b border-slate-200 bg-white px-3 sm:h-16 sm:px-6">
      <div className="flex min-w-0 items-center gap-2">
        <button
          type="button"
          onClick={onMenuClick}
          aria-label="Open navigation"
          className="flex h-10 w-10 items-center justify-center rounded-lg text-slate-600 hover:bg-slate-100 lg:hidden"
        >
          <span className="text-xl leading-none" aria-hidden="true">
            ☰
          </span>
        </button>
        <h1 className="truncate text-base font-semibold text-slate-800 sm:text-lg">{title}</h1>
      </div>
      <div className="flex flex-shrink-0 items-center gap-1 sm:gap-3">
        {/* Logout */}
        <button
          onClick={handleLogout}
          aria-label="Logout"
          className="flex h-10 items-center rounded-lg px-3 text-sm font-medium text-slate-600 hover:bg-slate-100"
        >
          <span className="sm:hidden" aria-hidden="true">
            🚪
          </span>
          <span className="hidden sm:inline">Logout</span>
        </button>
      </div>
    </header>
  )
}
