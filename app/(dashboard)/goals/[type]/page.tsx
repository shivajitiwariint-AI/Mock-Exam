'use client'

import { useState, useEffect, useCallback } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import type { GoalData, DailyGoalWithProgress } from '@/types'
import GoalCard from '@/components/goals/GoalCard'
import GoalModal from '@/components/goals/GoalModal'
import DailyCheckIn from '@/components/goals/DailyCheckIn'
import Button from '@/components/ui/Button'
import Skeleton from '@/components/ui/Skeleton'

const TYPE_MAP: Record<string, 'LIFE' | 'ANNUAL' | 'MONTHLY' | 'WEEKLY' | 'DAILY'> = {
  life: 'LIFE',
  annual: 'ANNUAL',
  monthly: 'MONTHLY',
  weekly: 'WEEKLY',
  daily: 'DAILY',
}

const TYPE_LABEL: Record<string, string> = {
  LIFE: '🌟 Life Goals',
  ANNUAL: '📅 Annual Goals',
  MONTHLY: '🗓️ Monthly Goals',
  WEEKLY: '📆 Weekly Goals',
  DAILY: '☀️ Daily Goals',
}

const today = new Date().toISOString().split('T')[0]

export default function GoalTypePage() {
  const params = useParams<{ type: string }>()
  const goalType = TYPE_MAP[params.type]

  const [goals, setGoals] = useState<GoalData[]>([])
  const [dailyGoals, setDailyGoals] = useState<DailyGoalWithProgress[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [editingGoal, setEditingGoal] = useState<GoalData | undefined>()

  const load = useCallback(async () => {
    if (!goalType) return
    setIsLoading(true)
    if (goalType === 'DAILY') {
      const res = await fetch('/api/goals/today')
      const data = await res.json() as { goals: DailyGoalWithProgress[] }
      setDailyGoals(data.goals ?? [])
    } else {
      const res = await fetch(`/api/goals?type=${goalType}`)
      const data = await res.json() as { goals: GoalData[] }
      setGoals(data.goals ?? [])
    }
    setIsLoading(false)
  }, [goalType])

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

  const handleSave = (saved: GoalData) => {
    if (goalType === 'DAILY') {
      setDailyGoals((prev) => {
        const exists = prev.find((g) => g.id === saved.id)
        if (exists) return prev.map((g) => g.id === saved.id ? { ...g, ...saved } : g)
        return [...prev, { ...saved, progress: null }]
      })
    } else {
      setGoals((prev) => {
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
    setGoals((prev) => prev.filter((g) => g.id !== id))
    setDailyGoals((prev) => prev.filter((g) => g.id !== id))
  }

  const handleComplete = async (id: number) => {
    await fetch(`/api/goals/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: 'COMPLETED' }),
    })
    setGoals((prev) => prev.filter((g) => g.id !== id))
  }

  if (!goalType) {
    return (
      <div className="text-center py-16">
        <p className="text-slate-500">Invalid goal type. <Link href="/goals" className="text-indigo-600 hover:underline">Go back</Link></p>
      </div>
    )
  }

  const label = TYPE_LABEL[goalType]
  const isEmpty = goalType === 'DAILY' ? dailyGoals.length === 0 : goals.length === 0

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <Link href="/goals" className="text-sm text-slate-500 hover:text-slate-700">← Back to Goals</Link>
          <h1 className="text-2xl font-bold text-slate-800 mt-1">{label}</h1>
        </div>
        <Button onClick={() => { setEditingGoal(undefined); setShowModal(true) }}>+ Add Goal</Button>
      </div>

      {isLoading ? (
        <div className="space-y-3">{Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} height="90px" />)}</div>
      ) : isEmpty ? (
        <div className="text-center py-16 rounded-xl border border-dashed border-slate-300 bg-slate-50">
          <span className="text-5xl mb-4 block">{label.split(' ')[0]}</span>
          <h3 className="text-lg font-semibold text-slate-700 mb-1">No {goalType.toLowerCase()} goals yet</h3>
          <p className="text-sm text-slate-500 mb-4">Add your first {goalType.toLowerCase()} goal to start tracking.</p>
          <Button onClick={() => setShowModal(true)}>+ Add Goal</Button>
        </div>
      ) : goalType === 'DAILY' ? (
        <DailyCheckIn goals={dailyGoals} onToggle={handleToggleDaily} />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {goals.map((goal) => (
            <GoalCard
              key={goal.id}
              goal={goal}
              onEdit={(g) => { setEditingGoal(g); setShowModal(true) }}
              onDelete={handleDelete}
              onComplete={handleComplete}
            />
          ))}
        </div>
      )}

      {showModal && (
        <GoalModal
          goal={editingGoal}
          defaultType={goalType}
          onClose={() => { setShowModal(false); setEditingGoal(undefined) }}
          onSave={handleSave}
        />
      )}
    </div>
  )
}
