'use client'

import Link from 'next/link'
import Image from 'next/image'
import { usePathname } from 'next/navigation'
import { useEffect, useState } from 'react'

const userNavItems = [
  { href: '/dashboard', label: 'Dashboard', icon: '⊞' },
  { href: '/education', label: 'Education', icon: '📚' },
  { href: '/exam-dashboard', label: 'Exam Dashboard', icon: '📈' },
  { href: '/exams', label: 'Exams', icon: '📝' },
  { href: '/interview/questions', label: 'Question Bank', icon: '🧠' },
  { href: '/study', label: 'Study Assistant', icon: '💬' },
  { href: '/history', label: 'Attempt History', icon: '🕘' },
  { href: '/interview', label: 'Interview Intelligence', icon: '🎯' },
  { href: '/interviews', label: 'Mock Interviews', icon: '🎤' },
  { href: '/goals', label: 'Goals', icon: '🏆' },
  { href: '/health', label: 'Health', icon: '❤️' },
  { href: '/meditation', label: 'Meditation', icon: '🧘' },
  { href: '/schedule', label: 'Schedule', icon: '⏰' },
  { href: '/analytics', label: 'Analytics', icon: '📊' },
  { href: '/achievements', label: 'Achievements', icon: '🌟' },
  { href: '/coach', label: 'AI Coach', icon: '🤖' },
]

const adminNavItems = [
  { href: '/admin', label: 'Growth Users', icon: '👥' },
  { href: '/admin/growth', label: 'Growth Reports', icon: '📊' },
  { href: '/admin/mock-exam', label: 'Mock Exam Admin', icon: '🧩' },
  { href: '/admin/subjects', label: 'Subjects', icon: '🏛️' },
  { href: '/admin/users', label: 'Accounts', icon: '🪪' },
  { href: '/admin/interviews', label: 'Interview Kits', icon: '🎙️' },
  { href: '/admin/progress', label: 'Student Progress', icon: '📈' },
]

type SidebarProps = {
  userName: string
  userAvatar: string | null
  growthScore: number
  isAdmin?: boolean
  isOpen?: boolean
  onClose?: () => void
}

export default function Sidebar({ userName, userAvatar, growthScore, isAdmin, isOpen = false, onClose }: SidebarProps) {
  const pathname = usePathname()
  const [menuSearch, setMenuSearch] = useState('')

  // Close the mobile drawer after navigating to a new page.
  useEffect(() => { onClose?.() }, [pathname, onClose])
  const navItems = isAdmin ? [...userNavItems, ...adminNavItems] : userNavItems
  const normalizedSearch = menuSearch.trim().toLowerCase()
  const filteredNavItems = normalizedSearch
    ? navItems.filter(
        (item) =>
          item.label.toLowerCase().includes(normalizedSearch) ||
          item.href.toLowerCase().includes(normalizedSearch),
      )
    : navItems

  return (
    <>
      {isOpen ? (
        <button
          type="button"
          aria-label="Close navigation"
          onClick={onClose}
          className="fixed inset-0 z-40 bg-slate-950/60 lg:hidden"
        />
      ) : null}
      <aside
        aria-label="Main navigation"
        className={`fixed inset-y-0 left-0 z-50 flex w-72 max-w-[85vw] flex-col bg-sidebar text-slate-400 shadow-2xl transition-transform duration-200 lg:static lg:z-auto lg:h-screen lg:w-60 lg:max-w-none lg:translate-x-0 lg:shadow-none ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* Logo */}
        <div className="flex items-center gap-3 border-b border-slate-700 px-5 py-4 sm:px-6 sm:py-5">
          <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg bg-accent text-white font-bold text-sm">
            P
          </div>
          <span className="font-bold text-white text-lg tracking-tight">PGCIP</span>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close menu"
            className="ml-auto rounded-lg p-1.5 text-slate-400 hover:bg-slate-800 hover:text-slate-200 lg:hidden"
          >
            ✕
          </button>
        </div>

      {/* Menu search */}
      <div className="border-b border-slate-700 px-3 py-3">
        <div className="flex items-center gap-2 rounded-lg bg-slate-800 px-3 py-2 ring-1 ring-inset ring-slate-700 focus-within:ring-accent">
          <span className="text-sm text-slate-500">🔍</span>
          <input
            value={menuSearch}
            onChange={(event) => setMenuSearch(event.target.value)}
            placeholder="Search menu..."
            aria-label="Search menu"
            className="min-w-0 flex-1 bg-transparent text-sm text-slate-200 placeholder:text-slate-500 focus:outline-none"
          />
          {menuSearch ? (
            <button
              type="button"
              onClick={() => setMenuSearch('')}
              aria-label="Clear menu search"
              className="text-xs text-slate-500 hover:text-slate-300"
            >
              ✕
            </button>
          ) : null}
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-1">
        {filteredNavItems.length === 0 ? (
          <p className="px-3 py-2 text-xs text-slate-500">No menu matches “{menuSearch}”.</p>
        ) : null}
        {filteredNavItems.map((item) => {
          const isActive = pathname === item.href || pathname.startsWith(item.href + '/')
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${
                isActive
                  ? isAdmin
                    ? 'bg-amber-500/10 text-amber-400'
                    : 'bg-accent/10 text-accent'
                  : 'text-slate-400 hover:bg-slate-800 hover:text-slate-200'
              }`}
            >
              <span className="text-base">{item.icon}</span>
              {item.label}
            </Link>
          )
        })}
      </nav>

      {/* User + Role */}
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
            <p className="text-xs text-slate-500">{isAdmin ? 'Administrator' : 'Growth Score'}</p>
          </div>
          {isAdmin ? (
            <span className="text-xs font-bold text-amber-400 bg-amber-400/10 px-2 py-0.5 rounded">Admin</span>
          ) : (
            <span className="text-sm font-bold text-accent">{growthScore}</span>
          )}
        </div>
      </div>
      </aside>
    </>
  )
}
