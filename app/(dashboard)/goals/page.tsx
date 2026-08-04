'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import type { GoalData, DailyGoalWithProgress } from '@/types'
import DailyCheckIn from '@/components/goals/DailyCheckIn'
import GoalCard from '@/components/goals/GoalCard'
import GoalModal from '@/components/goals/GoalModal'
import Button from '@/components/ui/Button'
import Skeleton from '@/components/ui/Skeleton'

export default function GoalsPage() {
  const [dailyGoals, setDailyGoals] = useState<DailyGoalWithProgress[]>([])
  const [weeklyGoals, setWeeklyGoals] = useState<GoalData[]>([])
  const [lifeGoals, setLifeGoals] = useState<GoalData[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [editingGoal, setEditingGoal] = useState<GoalData | undefined>()

  const today = new Date().toISOString().split('T')[0]

  const load = useCallback(async () => {
    setIsLoading(true)
    try {
      const [todayRes, weeklyRes, lifeRes] = await Promise.all([
        fetch('/api/goals/today'),
        fetch('/api/goals?type=WEEKLY&status=ACTIVE'),
        fetch('/api/goals?type=LIFE&status=ACTIVE'),
      ])
      const [todayData, weeklyData, lifeData] = await Promise.all([
        todayRes.json() as Promise<{ goals: DailyGoalWithProgress[] }>,
        weeklyRes.json() as Promise<{ goals: GoalData[] }>,
        lifeRes.json() as Promise<{ goals: GoalData[] }>,
      ])
      setDailyGoals(todayData.goals ?? [])
      setWeeklyGoals(weeklyData.goals ?? [])
      setLifeGoals(lifeData.goals ?? [])
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => { void load() }, [load])

  const handleToggleDaily = async (goalId: number, completed: boolean) => {
    await fetch(`/api/goals/${goalId}/progress`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ date: today, completed }),
    })
    setDailyGoals((prev) =>
      prev.map((g) =>
        g.id === goalId
          ? { ...g, progress: g.progress ? { ...g.progress, completed } : { id: 0, goalId, userId: 0, date: today, completed, notes: null, createdAt: new Date().toISOString() } }
          : g
      )
    )
  }

  const handleSaveGoal = (saved: GoalData) => {
    if (saved.type === 'DAILY') {
      setDailyGoals((prev) => {
        const exists = prev.find((g) => g.id === saved.id)
        if (exists) return prev.map((g) => g.id === saved.id ? { ...g, ...saved } : g)
        return [...prev, { ...saved, progress: null }]
      })
    } else if (saved.type === 'WEEKLY') {
      setWeeklyGoals((prev) => {
        const exists = prev.find((g) => g.id === saved.id)
        if (exists) return prev.map((g) => g.id === saved.id ? { ...g, ...saved } : g)
        return [...prev, saved]
      })
    } else if (saved.type === 'LIFE') {
      setLifeGoals((prev) => {
        const exists = prev.find((g) => g.id === saved.id)
        if (exists) return prev.map((g) => g.id === saved.id ? { ...g, ...saved } : g)
        return [...prev, saved]
      })
    }
    setEditingGoal(undefined)
  }

  const handleDelete = async (id: number) => {
    if (!confirm('Delete this goal?')) return
    await fetch(`/api/goals/${id}`, { method: 'DELETE' })
    setDailyGoals((prev) => prev.filter((g) => g.id !== id))
    setWeeklyGoals((prev) => prev.filter((g) => g.id !== id))
    setLifeGoals((prev) => prev.filter((g) => g.id !== id))
  }

  const handleComplete = async (id: number) => {
    await fetch(`/api/goals/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: 'COMPLETED' }),
    })
    setWeeklyGoals((prev) => prev.filter((g) => g.id !== id))
    setLifeGoals((prev) => prev.filter((g) => g.id !== id))
  }

  const completedToday = dailyGoals.filter((g) => g.progress?.completed).length

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Goal Management</h1>
          <p className="text-sm text-slate-500 mt-0.5">Life → Annual → Monthly → Weekly → Daily</p>
        </div>
        <Button onClick={() => { setEditingGoal(undefined); setShowModal(true) }}>+ Add Goal</Button>
      </div>

      {/* Stats bar */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Done Today', value: `${completedToday}/${dailyGoals.length}`, href: '/goals/daily' },
          { label: 'Weekly Active', value: weeklyGoals.length, href: '/goals/weekly' },
          { label: 'Life Goals', value: lifeGoals.length, href: '/goals/life' },
          { label: 'Monthly Goals', value: '—', href: '/goals/monthly' },
        ].map((stat) => (
          <Link key={stat.label} href={stat.href} className="rounded-xl border border-slate-200 bg-white p-4 text-center shadow-sm hover:shadow-md transition-shadow">
            <p className="text-2xl font-bold text-slate-800">{stat.value}</p>
            <p className="text-xs text-slate-500 mt-1">{stat.label}</p>
          </Link>
        ))}
      </div>

      {/* Goal level nav */}
      <div className="flex flex-wrap gap-2">
        {[
          { label: '🌟 Life Goals', href: '/goals/life' },
          { label: '📅 Annual', href: '/goals/annual' },
          { label: '🗓️ Monthly', href: '/goals/monthly' },
          { label: '📆 Weekly', href: '/goals/weekly' },
          { label: '☀️ Daily', href: '/goals/daily' },
        ].map((nav) => (
          <Link
            key={nav.href}
            href={nav.href}
            className="px-4 py-2 rounded-lg border border-slate-200 bg-white text-sm text-slate-700 hover:border-indigo-400 hover:text-indigo-700 transition-colors"
          >
            {nav.label}
          </Link>
        ))}
      </div>

      {isLoading ? (
        <div className="space-y-4"><Skeleton height="200px" /><Skeleton height="150px" /></div>
      ) : (
        <>
          {/* Today's Check-in */}
          <section>
            <h2 className="font-semibold text-slate-800 mb-3">☀️ Today&apos;s Check-in</h2>
            <DailyCheckIn goals={dailyGoals} onToggle={handleToggleDaily} />
          </section>

          {/* This Week */}
          {weeklyGoals.length > 0 && (
            <section>
              <div className="flex items-center justify-between mb-3">
                <h2 className="font-semibold text-slate-800">📆 This Week</h2>
                <Link href="/goals/weekly" className="text-xs text-indigo-600 hover:text-indigo-800">View all →</Link>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {weeklyGoals.slice(0, 4).map((goal) => (
                  <GoalCard
                    key={goal.id}
                    goal={goal}
                    onEdit={(g) => { setEditingGoal(g); setShowModal(true) }}
                    onDelete={handleDelete}
                    onComplete={handleComplete}
                  />
                ))}
              </div>
            </section>
          )}

          {/* Life Goals */}
          {lifeGoals.length > 0 && (
            <section>
              <div className="flex items-center justify-between mb-3">
                <h2 className="font-semibold text-slate-800">🌟 Life Goals</h2>
                <Link href="/goals/life" className="text-xs text-indigo-600 hover:text-indigo-800">View all →</Link>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {lifeGoals.slice(0, 4).map((goal) => (
                  <GoalCard
                    key={goal.id}
                    goal={goal}
                    onEdit={(g) => { setEditingGoal(g); setShowModal(true) }}
                    onDelete={handleDelete}
                    onComplete={handleComplete}
                  />
                ))}
              </div>
            </section>
          )}
        </>
      )}

      {showModal && (
        <GoalModal
          goal={editingGoal}
          onClose={() => { setShowModal(false); setEditingGoal(undefined) }}
          onSave={handleSaveGoal}
        />
      )}
    </div>
  )
}
