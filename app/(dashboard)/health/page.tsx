'use client'

import { useState, useEffect, useCallback } from 'react'
import type { HealthLogData } from '@/types'
import HealthLogForm from '@/components/health/HealthLogForm'
import MetricBar from '@/components/health/MetricBar'
import Skeleton from '@/components/ui/Skeleton'

export default function HealthPage() {
  const [todayLog, setTodayLog] = useState<HealthLogData | null>(null)
  const [recentLogs, setRecentLogs] = useState<HealthLogData[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [editingLog, setEditingLog] = useState<HealthLogData | null>(null)

  const today = new Date().toISOString().split('T')[0]

  const sevenDaysAgo = (() => {
    const d = new Date(); d.setDate(d.getDate() - 6); return d.toISOString().split('T')[0]
  })()

  const load = useCallback(async () => {
    setIsLoading(true)
    try {
      const [todayRes, recentRes] = await Promise.all([
        fetch('/api/health/logs/today'),
        fetch(`/api/health/logs?from=${sevenDaysAgo}&to=${today}`),
      ])
      const [todayData, recentData] = await Promise.all([
        todayRes.json() as Promise<{ log: HealthLogData | null }>,
        recentRes.json() as Promise<{ logs: HealthLogData[] }>,
      ])
      setTodayLog(todayData.log)
      setRecentLogs(recentData.logs ?? [])
    } finally {
      setIsLoading(false)
    }
  }, [today, sevenDaysAgo])

  useEffect(() => { void load() }, [load])

  const handleSaved = (log: HealthLogData) => {
    const logDay = log.date.split('T')[0]
    if (logDay === today) setTodayLog(log)
    setRecentLogs((prev) => {
      const idx = prev.findIndex((l) => l.id === log.id)
      if (idx >= 0) return prev.map((l) => l.id === log.id ? log : l)
      return [log, ...prev].sort((a, b) => b.date.localeCompare(a.date))
    })
    setEditingLog(null)
  }

  const handleDelete = async (id: number) => {
    if (!confirm('Delete this log?')) return
    await fetch(`/api/health/logs/${id}`, { method: 'DELETE' })
    if (todayLog?.id === id) setTodayLog(null)
    setRecentLogs((prev) => prev.filter((l) => l.id !== id))
  }

  const activeDays = recentLogs.filter((l) =>
    (l.exerciseMins ?? 0) > 0 || (l.waterGlasses ?? 0) > 0 || (l.sleepHours ?? 0) > 0
  ).length

  const healthScore = (() => {
    if (recentLogs.length === 0) return 0
    const exerciseDays = recentLogs.filter((l) => (l.exerciseMins ?? 0) >= 30).length
    const waterDays = recentLogs.filter((l) => (l.waterGlasses ?? 0) >= 8).length
    const sleepDays = recentLogs.filter((l) => (l.sleepHours ?? 0) >= 7).length
    return Math.max(0, Math.min(100, Math.round(exerciseDays / 7 * 40 + waterDays / 7 * 30 + sleepDays / 7 * 30)))
  })()

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-800">Health Tracking</h1>
        <p className="text-sm text-slate-500 mt-0.5">Log exercise, sleep, water, and weight daily</p>
      </div>

      {/* Stats bar */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Active Days (7d)', value: `${activeDays}/7` },
          { label: 'Health Score', value: `${healthScore}/100` },
          { label: 'Today Exercise', value: todayLog?.exerciseMins != null ? `${todayLog.exerciseMins} min` : '—' },
          { label: 'Today Water', value: todayLog?.waterGlasses != null ? `${todayLog.waterGlasses} glasses` : '—' },
        ].map((s) => (
          <div key={s.label} className="rounded-xl border border-slate-200 bg-white p-4 text-center shadow-sm">
            <p className="text-xl font-bold text-slate-800">{s.value}</p>
            <p className="text-xs text-slate-500 mt-1">{s.label}</p>
          </div>
        ))}
      </div>

      {isLoading ? (
        <div className="space-y-4"><Skeleton height="200px" /><Skeleton height="300px" /></div>
      ) : (
        <>
          {/* Today&apos;s Log Form */}
          <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="font-semibold text-slate-800 mb-4">
              {editingLog ? `Edit Log — ${new Date(editingLog.date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })}` : "Today's Log"}
            </h2>
            <HealthLogForm
              existingLog={editingLog ?? todayLog}
              defaultDate={editingLog ? editingLog.date.split('T')[0] : today}
              onSaved={handleSaved}
            />
            {editingLog && (
              <button onClick={() => setEditingLog(null)} className="mt-2 text-xs text-slate-400 hover:text-slate-600">
                ← Back to today
              </button>
            )}
          </div>

          {/* 7-Day Metric Bars */}
          {recentLogs.length > 0 && (
            <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
              <h2 className="font-semibold text-slate-800 mb-4">Weekly Progress (7-day targets)</h2>
              <div className="space-y-4">
                <MetricBar
                  label="Exercise days"
                  value={recentLogs.filter((l) => (l.exerciseMins ?? 0) >= 30).length}
                  target={7}
                  unit="days"
                  color="bg-green-500"
                />
                <MetricBar
                  label="Water goal days"
                  value={recentLogs.filter((l) => (l.waterGlasses ?? 0) >= 8).length}
                  target={7}
                  unit="days"
                  color="bg-blue-500"
                />
                <MetricBar
                  label="Sleep goal days"
                  value={recentLogs.filter((l) => (l.sleepHours ?? 0) >= 7).length}
                  target={7}
                  unit="days"
                  color="bg-purple-500"
                />
              </div>
            </div>
          )}

          {/* Recent Logs */}
          {recentLogs.length > 0 && (
            <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
              <h2 className="font-semibold text-slate-800 mb-4">Recent Logs (7 days)</h2>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left text-xs text-slate-500 border-b border-slate-100">
                      <th className="pb-2 font-medium">Date</th>
                      <th className="pb-2 font-medium">Exercise</th>
                      <th className="pb-2 font-medium">Sleep</th>
                      <th className="pb-2 font-medium">Water</th>
                      <th className="pb-2 font-medium">Weight</th>
                      <th className="pb-2 font-medium"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {recentLogs.map((log) => (
                      <tr key={log.id} className="hover:bg-slate-50">
                        <td className="py-2 font-medium text-slate-700">
                          {new Date(log.date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })}
                        </td>
                        <td className="py-2 text-slate-600">
                          {log.exerciseMins != null ? (
                            <span className={(log.exerciseMins >= 30) ? 'text-green-600 font-semibold' : ''}>
                              {log.exerciseMins} min
                            </span>
                          ) : '—'}
                        </td>
                        <td className="py-2 text-slate-600">
                          {log.sleepHours != null ? (
                            <span className={(log.sleepHours >= 7) ? 'text-green-600 font-semibold' : ''}>
                              {log.sleepHours}h
                            </span>
                          ) : '—'}
                        </td>
                        <td className="py-2 text-slate-600">
                          {log.waterGlasses != null ? (
                            <span className={(log.waterGlasses >= 8) ? 'text-green-600 font-semibold' : ''}>
                              {log.waterGlasses} gl
                            </span>
                          ) : '—'}
                        </td>
                        <td className="py-2 text-slate-600">
                          {log.weightKg != null ? `${log.weightKg} kg` : '—'}
                        </td>
                        <td className="py-2">
                          <div className="flex gap-1">
                            <button onClick={() => setEditingLog(log)} className="text-slate-400 hover:text-slate-700 text-xs">✏️</button>
                            <button onClick={() => handleDelete(log.id)} className="text-slate-400 hover:text-red-500 text-xs">🗑️</button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  )
}
