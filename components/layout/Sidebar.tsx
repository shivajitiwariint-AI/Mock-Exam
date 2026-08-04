'use client'

import Link from 'next/link'
import Image from 'next/image'
import { usePathname } from 'next/navigation'

const navItems = [
  { href: '/dashboard', label: 'Dashboard', icon: '⊞' },
  { href: '/education', label: 'Education', icon: '📚' },
  { href: '/interview', label: 'Interview', icon: '🎯' },
  { href: '/goals', label: 'Goals', icon: '🏆' },
  { href: '/health', label: 'Health', icon: '❤️' },
  { href: '/meditation', label: 'Meditation', icon: '🧘' },
  { href: '/analytics', label: 'Analytics', icon: '📊' },
  { href: '/achievements', label: 'Achievements', icon: '🌟' },
  { href: '/coach', label: 'AI Coach', icon: '🤖' },
]

type SidebarProps = {
  userName: string
  userAvatar: string | null
  growthScore: number
}

export default function Sidebar({ userName, userAvatar, growthScore }: SidebarProps) {
  const pathname = usePathname()

  return (
    <aside className="flex h-screen w-60 flex-col bg-sidebar text-slate-400">
      {/* Logo */}
      <div className="flex items-center gap-3 px-6 py-5 border-b border-slate-700">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-accent text-white font-bold text-sm">
          P
        </div>
        <span className="font-bold text-white text-lg tracking-tight">PGCIP</span>
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-1">
        {navItems.map((item) => {
          const isActive = pathname === item.href || pathname.startsWith(item.href + '/')
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${
                isActive
                  ? 'bg-accent/10 text-accent'
                  : 'text-slate-400 hover:bg-slate-800 hover:text-slate-200'
              }`}
            >
              <span className="text-base">{item.icon}</span>
              {item.label}
            </Link>
          )
        })}
      </nav>

      {/* User + Score */}
      <div className="border-t border-slate-700 px-4 py-4">
        <div className="flex items-center gap-3 mb-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-accent/20 text-accent font-semibold text-sm">
            {userAvatar ? (
              <Image src={userAvatar} alt={userName} width={32} height={32} className="rounded-full object-cover" />
            ) : (
              userName.charAt(0).toUpperCase()
            )}
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium text-slate-200">{userName}</p>
            <p className="text-xs text-slate-500">Growth Score</p>
          </div>
          <span className="text-sm font-bold text-accent">{growthScore}</span>
        </div>
      </div>
    </aside>
  )
}
