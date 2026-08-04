'use client'

import { useState, useEffect, useCallback } from 'react'
import type { MeditationLogData } from '@/types'
import MeditationLogCard from '@/components/meditation/MeditationLogCard'
import MeditationForm from '@/components/meditation/MeditationForm'
import Button from '@/components/ui/Button'
import Skeleton from '@/components/ui/Skeleton'

function SevenDayDots({ logs }: { logs: MeditationLogData[] }) {
  const days: { label: string; date: string }[] = []
  for (let i = 6; i >= 0; i--) {
    const d = new Date()
    d.setDate(d.getDate() - i)
    days.push({
      label: d.toLocaleDateString('en-IN', { weekday: 'short' }),
      date: d.toISOString().split('T')[0],
    })
  }
  const sessionDates = new Set(logs.map((l) => l.date.split('T')[0]))

  return (
    <div className="flex gap-3 flex-wrap">
      {days.map(({ label, date }) => {
        const hasSession = sessionDates.has(date)
        return (
          <div key={date} className="flex flex-col items-center gap-1">
            <div className={`w-8 h-8 rounded-full border-2 flex items-center justify-center text-xs font-semibold ${
              hasSession ? 'bg-green-500 border-green-500 text-white' : 'bg-white border-slate-200 text-slate-400'
            }`}>
              {hasSession ? '✓' : '·'}
            </div>
            <span className="text-xs text-slate-500">{label}</span>
          </div>
        )
      })}
    </div>
  )
}

export default function MeditationPage() {
  const [logs, setLogs] = useState<MeditationLogData[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editingLog, setEditingLog] = useState<MeditationLogData | undefined>()

  const today = new Date().toISOString().split('T')[0]
  const sevenDaysAgo = (() => {
    const d = new Date(); d.setDate(d.getDate() - 6); return d.toISOString().split('T')[0]
  })()

  const load = useCallback(async () => {
    setIsLoading(true)
    try {
      const res = await fetch(`/api/meditation/logs?from=${sevenDaysAgo}`)
      const data = await res.json() as { logs: MeditationLogData[] }
      setLogs(data.logs ?? [])
    } finally {
      setIsLoading(false)
    }
  }, [sevenDaysAgo])

  useEffect(() => { void load() }, [load])

  const handleSaved = (log: MeditationLogData) => {
    setLogs((prev) => {
      const idx = prev.findIndex((l) => l.id === log.id)
      if (idx >= 0) return prev.map((l) => l.id === log.id ? log : l)
      return [log, ...prev].sort((a, b) => b.date.localeCompare(a.date))
    })
    setShowForm(false)
    setEditingLog(undefined)
  }

  const handleDelete = async (id: number) => {
    if (!confirm('Delete this session?')) return
    await fetch(`/api/meditation/logs/${id}`, { method: 'DELETE' })
    setLogs((prev) => prev.filter((l) => l.id !== id))
  }

  const todaySessions = logs.filter((l) => l.date.split('T')[0] === today)
  const totalMinsToday = todaySessions.reduce((sum, l) => sum + l.durationMins, 0)
  const uniqueDays = new Set(logs.map((l) => l.date.split('T')[0])).size

  const meditationScore = (() => {
    if (logs.length === 0) return 0
    const totalMins = logs.reduce((sum, l) => sum + l.durationMins, 0)
    const avgDur = totalMins / logs.length
    return Math.max(0, Math.min(100, Math.round(uniqueDays / 7 * 60 + Math.min(avgDur / 30, 1) * 40)))
  })()

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Meditation</h1>
          <p className="text-sm text-slate-500 mt-0.5">Track sessions and build a mindfulness habit</p>
        </div>
        <Button onClick={() => { setEditingLog(undefined); setShowForm(true) }}>+ Log Session</Button>
      </div>

      {/* Stats bar */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Active Days (7d)', value: `${uniqueDays}/7` },
          { label: 'Meditation Score', value: `${meditationScore}/100` },
          { label: 'Today Sessions', value: todaySessions.length },
          { label: 'Today Total', value: totalMinsToday > 0 ? `${totalMinsToday} min` : '—' },
        ].map((s) => (
          <div key={s.label} className="rounded-xl border border-slate-200 bg-white p-4 text-center shadow-sm">
            <p className="text-xl font-bold text-slate-800">{s.value}</p>
            <p className="text-xs text-slate-500 mt-1">{s.label}</p>
          </div>
        ))}
      </div>

      {isLoading ? (
        <div className="space-y-4"><Skeleton height="100px" /><Skeleton height="300px" /></div>
      ) : (
        <>
          {/* 7-Day Dot Calendar */}
          <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="font-semibold text-slate-800 mb-4">7-Day Consistency</h2>
            <SevenDayDots logs={logs} />
          </div>

          {/* Today&apos;s Sessions */}
          {todaySessions.length > 0 && (
            <section>
              <h2 className="font-semibold text-slate-800 mb-3">Today&apos;s Sessions</h2>
              <div className="space-y-3">
                {todaySessions.map((log) => (
                  <MeditationLogCard
                    key={log.id}
                    log={log}
                    onEdit={(l) => { setEditingLog(l); setShowForm(true) }}
                    onDelete={handleDelete}
                  />
                ))}
              </div>
            </section>
          )}

          {/* Recent History */}
          {logs.filter((l) => l.date.split('T')[0] !== today).length > 0 && (
            <section>
              <h2 className="font-semibold text-slate-800 mb-3">Earlier Sessions</h2>
              <div className="space-y-3">
                {logs.filter((l) => l.date.split('T')[0] !== today).slice(0, 10).map((log) => (
                  <MeditationLogCard
                    key={log.id}
                    log={log}
                    onEdit={(l) => { setEditingLog(l); setShowForm(true) }}
                    onDelete={handleDelete}
                  />
                ))}
              </div>
            </section>
          )}

          {logs.length === 0 && (
            <div className="text-center py-12 text-slate-400">
              <p className="text-4xl mb-3">🧘</p>
              <p className="font-medium">No sessions logged yet</p>
              <p className="text-sm mt-1">Click &quot;+ Log Session&quot; to get started</p>
            </div>
          )}
        </>
      )}

      {showForm && (
        <MeditationForm
          existing={editingLog}
          onClose={() => { setShowForm(false); setEditingLog(undefined) }}
          onSaved={handleSaved}
        />
      )}
    </div>
  )
}
