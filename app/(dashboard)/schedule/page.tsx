'use client'

import { useEffect, useState, useCallback } from 'react'

type Block = {
  id: number
  startTime: string
  endTime: string
  label: string
  category: string | null
  color: string | null
  order: number
}

type LogStatus = 'DONE' | 'SKIPPED' | 'PARTIAL'

type DayLog = {
  id: number
  blockId: number
  status: LogStatus
  note: string | null
}

type HistoryEntry = {
  date: string
  done: number
  total: number
  pct: number
}

const CATEGORIES = ['Study', 'Health', 'Work', 'Personal', 'Family', 'Hobby', 'Other']
const COLORS = [
  { label: 'Indigo', value: 'indigo' },
  { label: 'Emerald', value: 'emerald' },
  { label: 'Amber', value: 'amber' },
  { label: 'Rose', value: 'rose' },
  { label: 'Blue', value: 'blue' },
  { label: 'Purple', value: 'purple' },
  { label: 'Teal', value: 'teal' },
]

const COLOR_MAP: Record<string, string> = {
  indigo: 'bg-indigo-100 text-indigo-700 border-indigo-200',
  emerald: 'bg-emerald-100 text-emerald-700 border-emerald-200',
  amber: 'bg-amber-100 text-amber-700 border-amber-200',
  rose: 'bg-rose-100 text-rose-700 border-rose-200',
  blue: 'bg-blue-100 text-blue-700 border-blue-200',
  purple: 'bg-purple-100 text-purple-700 border-purple-200',
  teal: 'bg-teal-100 text-teal-700 border-teal-200',
}

function toDateStr(d: Date) {
  return d.toISOString().split('T')[0]
}

function fmt12(time24: string) {
  const [h, m] = time24.split(':').map(Number)
  const ampm = h >= 12 ? 'PM' : 'AM'
  const hour = h % 12 || 12
  return `${hour}:${String(m).padStart(2, '0')} ${ampm}`
}

export default function SchedulePage() {
  const [tab, setTab] = useState<'schedule' | 'tracker' | 'history'>('tracker')
  const [blocks, setBlocks] = useState<Block[]>([])
  const [logs, setLogs] = useState<DayLog[]>([])
  const [history, setHistory] = useState<HistoryEntry[]>([])
  const [selectedDate, setSelectedDate] = useState(toDateStr(new Date()))
  const [loading, setLoading] = useState(true)

  // Add/edit block form
  const [showForm, setShowForm] = useState(false)
  const [editBlock, setEditBlock] = useState<Block | null>(null)
  const [form, setForm] = useState({ startTime: '06:00', endTime: '07:00', label: '', category: '', color: 'indigo' })
  const [saving, setSaving] = useState(false)

  const loadBlocks = useCallback(async () => {
    const res = await fetch('/api/schedule/blocks')
    const d = await res.json() as { blocks: Block[] }
    setBlocks(d.blocks ?? [])
  }, [])

  const loadLogs = useCallback(async (date: string) => {
    const res = await fetch(`/api/schedule/logs?date=${date}`)
    const d = await res.json() as { logs: DayLog[] }
    setLogs(d.logs ?? [])
  }, [])

  const loadHistory = useCallback(async () => {
    const res = await fetch('/api/schedule/logs?days=7')
    const d = await res.json() as { logs: Array<{ date: string; status: string; blockId: number }> }
    const raw = d.logs ?? []

    // Group by date
    const byDate: Record<string, { done: number; total: number }> = {}
    raw.forEach((l) => {
      const day = l.date.split('T')[0]
      if (!byDate[day]) byDate[day] = { done: 0, total: 0 }
      byDate[day].total++
      if (l.status === 'DONE' || l.status === 'PARTIAL') byDate[day].done++
    })

    const entries: HistoryEntry[] = []
    for (let i = 6; i >= 0; i--) {
      const d = new Date()
      d.setDate(d.getDate() - i)
      const day = toDateStr(d)
      const stats = byDate[day] ?? { done: 0, total: 0 }
      entries.push({ date: day, done: stats.done, total: stats.total, pct: stats.total ? Math.round((stats.done / stats.total) * 100) : 0 })
    }
    setHistory(entries)
  }, [])

  useEffect(() => {
    setLoading(true)
    Promise.all([loadBlocks(), loadLogs(selectedDate), loadHistory()]).finally(() => setLoading(false))
  }, [loadBlocks, loadLogs, loadHistory, selectedDate])

  const openAdd = () => {
    setEditBlock(null)
    setForm({ startTime: '06:00', endTime: '07:00', label: '', category: '', color: 'indigo' })
    setShowForm(true)
  }

  const openEdit = (b: Block) => {
    setEditBlock(b)
    setForm({ startTime: b.startTime, endTime: b.endTime, label: b.label, category: b.category ?? '', color: b.color ?? 'indigo' })
    setShowForm(true)
  }

  const handleSaveBlock = async () => {
    if (!form.label.trim()) return
    setSaving(true)
    const body = { startTime: form.startTime, endTime: form.endTime, label: form.label.trim(), category: form.category || null, color: form.color }
    if (editBlock) {
      await fetch(`/api/schedule/blocks/${editBlock.id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
    } else {
      await fetch('/api/schedule/blocks', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
    }
    await loadBlocks()
    setShowForm(false)
    setSaving(false)
  }

  const handleDeleteBlock = async (id: number) => {
    if (!confirm('Delete this schedule block?')) return
    await fetch(`/api/schedule/blocks/${id}`, { method: 'DELETE' })
    setBlocks((prev) => prev.filter((b) => b.id !== id))
  }

  const handleToggleLog = async (blockId: number, currentStatus: LogStatus | undefined) => {
    const next: LogStatus = currentStatus === 'DONE' ? 'SKIPPED' : currentStatus === 'SKIPPED' ? 'PARTIAL' : 'DONE'
    await fetch('/api/schedule/logs', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ blockId, date: selectedDate, status: next }),
    })
    setLogs((prev) => {
      const existing = prev.find((l) => l.blockId === blockId)
      if (existing) return prev.map((l) => l.blockId === blockId ? { ...l, status: next } : l)
      return [...prev, { id: Date.now(), blockId, status: next, note: null }]
    })
  }

  const logForBlock = (blockId: number) => logs.find((l) => l.blockId === blockId)

  const statusIcon = (s: LogStatus | undefined) => {
    if (s === 'DONE') return <span className="text-emerald-500 text-lg">✓</span>
    if (s === 'SKIPPED') return <span className="text-rose-400 text-lg">✗</span>
    if (s === 'PARTIAL') return <span className="text-amber-400 text-lg">◑</span>
    return <span className="text-slate-300 text-lg">○</span>
  }

  const doneCount = logs.filter((l) => l.status === 'DONE' || l.status === 'PARTIAL').length
  const pct = blocks.length ? Math.round((doneCount / blocks.length) * 100) : 0

  if (loading) {
    return (
      <div className="space-y-4 animate-pulse">
        <div className="h-8 bg-slate-200 rounded w-48" />
        <div className="h-64 bg-slate-200 rounded-xl" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Daily Schedule</h1>
          <p className="text-sm text-slate-500 mt-0.5">Plan your day and track how well you follow it</p>
        </div>
        {tab === 'schedule' && (
          <button onClick={openAdd} className="bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors">
            + Add Block
          </button>
        )}
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-slate-100 rounded-xl p-1 w-fit">
        {(['tracker', 'schedule', 'history'] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-colors ${tab === t ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
          >
            {t === 'tracker' ? "Today's Tracker" : t === 'schedule' ? 'My Schedule' : 'History'}
          </button>
        ))}
      </div>

      {/* TODAY'S TRACKER */}
      {tab === 'tracker' && (
        <div className="space-y-4">
          <div className="flex items-center gap-4">
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
            {blocks.length > 0 && (
              <div className="flex items-center gap-2 text-sm">
                <div className="flex-1 w-32 h-2 rounded-full bg-slate-200">
                  <div className="h-2 rounded-full bg-indigo-500 transition-all" style={{ width: `${pct}%` }} />
                </div>
                <span className="font-semibold text-slate-700">{pct}% done</span>
                <span className="text-slate-500">({doneCount}/{blocks.length})</span>
              </div>
            )}
          </div>

          {blocks.length === 0 ? (
            <div className="text-center py-16 rounded-xl border border-dashed border-slate-300 bg-slate-50">
              <span className="text-5xl mb-4 block">⏰</span>
              <h3 className="text-lg font-semibold text-slate-700 mb-1">No schedule yet</h3>
              <p className="text-sm text-slate-500 mb-4">Set up your daily schedule first, then track it here.</p>
              <button onClick={() => setTab('schedule')} className="bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium px-4 py-2 rounded-lg">
                Set Up Schedule
              </button>
            </div>
          ) : (
            <div className="space-y-2">
              {blocks.map((b) => {
                const log = logForBlock(b.id)
                const colorCls = COLOR_MAP[b.color ?? 'indigo'] ?? COLOR_MAP.indigo
                return (
                  <div
                    key={b.id}
                    onClick={() => handleToggleLog(b.id, log?.status)}
                    className={`flex items-center gap-4 rounded-xl border px-4 py-3 cursor-pointer hover:shadow-sm transition-all ${
                      log?.status === 'DONE' ? 'bg-emerald-50 border-emerald-200' :
                      log?.status === 'SKIPPED' ? 'bg-rose-50 border-rose-200 opacity-60' :
                      log?.status === 'PARTIAL' ? 'bg-amber-50 border-amber-200' :
                      'bg-white border-slate-200'
                    }`}
                  >
                    <div className="w-8 flex-shrink-0 flex items-center justify-center">
                      {statusIcon(log?.status)}
                    </div>
                    <div className="flex-1">
                      <p className={`font-medium text-sm ${log?.status === 'SKIPPED' ? 'line-through text-slate-400' : 'text-slate-800'}`}>{b.label}</p>
                      <p className="text-xs text-slate-500">{fmt12(b.startTime)} – {fmt12(b.endTime)}</p>
                    </div>
                    {b.category && (
                      <span className={`text-xs px-2 py-0.5 rounded-full border ${colorCls}`}>{b.category}</span>
                    )}
                    <span className="text-xs text-slate-400">Click to cycle</span>
                  </div>
                )
              })}
            </div>
          )}

          {blocks.length > 0 && (
            <p className="text-xs text-slate-400 text-center">Click a block: ○ Not tracked → ✓ Done → ✗ Skipped → ◑ Partial → ✓ Done</p>
          )}
        </div>
      )}

      {/* MY SCHEDULE */}
      {tab === 'schedule' && (
        <div className="space-y-3">
          {blocks.length === 0 ? (
            <div className="text-center py-16 rounded-xl border border-dashed border-slate-300 bg-slate-50">
              <span className="text-5xl mb-4 block">📅</span>
              <h3 className="text-lg font-semibold text-slate-700 mb-1">Build your daily schedule</h3>
              <p className="text-sm text-slate-500 mb-4">Add time blocks from morning to night. Then track them daily.</p>
              <button onClick={openAdd} className="bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium px-4 py-2 rounded-lg">
                + Add First Block
              </button>
            </div>
          ) : (
            blocks.map((b) => {
              const colorCls = COLOR_MAP[b.color ?? 'indigo'] ?? COLOR_MAP.indigo
              return (
                <div key={b.id} className="flex items-center gap-4 rounded-xl border border-slate-200 bg-white px-4 py-3 shadow-sm">
                  <div className="text-center min-w-[80px]">
                    <p className="text-xs font-semibold text-slate-700">{fmt12(b.startTime)}</p>
                    <p className="text-xs text-slate-400">to {fmt12(b.endTime)}</p>
                  </div>
                  <div className="flex-1">
                    <p className="font-medium text-sm text-slate-800">{b.label}</p>
                    {b.category && <span className={`text-xs px-2 py-0.5 rounded-full border ${colorCls}`}>{b.category}</span>}
                  </div>
                  <div className="flex gap-2">
                    <button onClick={() => openEdit(b)} className="text-xs text-slate-500 hover:text-indigo-600 px-2 py-1 rounded hover:bg-slate-100 transition-colors">Edit</button>
                    <button onClick={() => handleDeleteBlock(b.id)} className="text-xs text-slate-500 hover:text-rose-600 px-2 py-1 rounded hover:bg-slate-100 transition-colors">Delete</button>
                  </div>
                </div>
              )
            })
          )}
        </div>
      )}

      {/* HISTORY */}
      {tab === 'history' && (
        <div className="space-y-4">
          <h2 className="text-sm font-semibold text-slate-600 uppercase tracking-wide">Last 7 Days</h2>
          <div className="grid grid-cols-7 gap-2">
            {history.map((h) => {
              const d = new Date(h.date + 'T12:00:00')
              const isToday = h.date === toDateStr(new Date())
              const color = h.total === 0 ? 'bg-slate-100 text-slate-400' : h.pct >= 80 ? 'bg-emerald-500 text-white' : h.pct >= 50 ? 'bg-amber-400 text-white' : 'bg-rose-400 text-white'
              return (
                <div key={h.date} className={`rounded-xl p-3 text-center ${isToday ? 'ring-2 ring-indigo-500' : ''}`} style={{ background: h.total === 0 ? '#f1f5f9' : undefined }}>
                  <div className={`rounded-lg p-2 mb-1 ${color}`}>
                    <p className="text-lg font-bold">{h.total === 0 ? '—' : `${h.pct}%`}</p>
                  </div>
                  <p className="text-xs font-medium text-slate-600">{d.toLocaleDateString('en', { weekday: 'short' })}</p>
                  <p className="text-xs text-slate-400">{d.getDate()}/{d.getMonth() + 1}</p>
                  {h.total > 0 && <p className="text-xs text-slate-400 mt-0.5">{h.done}/{h.total}</p>}
                </div>
              )
            })}
          </div>

          <div className="rounded-xl border border-slate-200 bg-white p-4">
            <h3 className="text-sm font-semibold text-slate-700 mb-3">Weekly Summary</h3>
            <div className="grid grid-cols-3 gap-4 text-center">
              <div>
                <p className="text-2xl font-bold text-slate-800">{history.filter(h => h.total > 0).length}</p>
                <p className="text-xs text-slate-500">Active days</p>
              </div>
              <div>
                <p className="text-2xl font-bold text-emerald-600">
                  {history.reduce((s, h) => s + (h.pct >= 80 ? 1 : 0), 0)}
                </p>
                <p className="text-xs text-slate-500">Great days (≥80%)</p>
              </div>
              <div>
                <p className="text-2xl font-bold text-indigo-600">
                  {history.reduce((s, h) => s + h.pct, 0) / Math.max(history.filter(h => h.total > 0).length, 1) | 0}%
                </p>
                <p className="text-xs text-slate-500">Avg completion</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ADD/EDIT BLOCK MODAL */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md mx-4 p-6">
            <h2 className="text-lg font-bold text-slate-800 mb-4">{editBlock ? 'Edit Block' : 'Add Schedule Block'}</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Label *</label>
                <input
                  value={form.label}
                  onChange={(e) => setForm((f) => ({ ...f, label: e.target.value }))}
                  placeholder="e.g. Morning Exercise"
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Start Time</label>
                  <input type="time" value={form.startTime} onChange={(e) => setForm((f) => ({ ...f, startTime: e.target.value }))}
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">End Time</label>
                  <input type="time" value={form.endTime} onChange={(e) => setForm((f) => ({ ...f, endTime: e.target.value }))}
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Category</label>
                  <select value={form.category} onChange={(e) => setForm((f) => ({ ...f, category: e.target.value }))}
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500">
                    <option value="">— None —</option>
                    {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Color</label>
                  <select value={form.color} onChange={(e) => setForm((f) => ({ ...f, color: e.target.value }))}
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500">
                    {COLORS.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}
                  </select>
                </div>
              </div>
              <div className="flex gap-2 pt-2">
                <button onClick={() => setShowForm(false)} className="flex-1 px-4 py-2 rounded-lg border border-slate-300 text-sm text-slate-700 hover:bg-slate-50 transition-colors">
                  Cancel
                </button>
                <button onClick={handleSaveBlock} disabled={saving || !form.label.trim()}
                  className="flex-1 px-4 py-2 rounded-lg bg-indigo-600 text-white text-sm font-medium hover:bg-indigo-700 disabled:opacity-50 transition-colors">
                  {saving ? 'Saving…' : editBlock ? 'Save Changes' : 'Add Block'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
