'use client'

import { useState } from 'react'
import type { HealthLogData } from '@/types'
import Button from '@/components/ui/Button'

type Props = {
  existingLog?: HealthLogData | null
  defaultDate?: string
  onSaved: (log: HealthLogData) => void
}

export default function HealthLogForm({ existingLog, defaultDate, onSaved }: Props) {
  const today = defaultDate ?? new Date().toISOString().split('T')[0]
  const [date, setDate] = useState(existingLog ? existingLog.date.split('T')[0] : today)
  const [exerciseMins, setExerciseMins] = useState(existingLog?.exerciseMins?.toString() ?? '')
  const [sleepHours, setSleepHours] = useState(existingLog?.sleepHours?.toString() ?? '')
  const [waterGlasses, setWaterGlasses] = useState(existingLog?.waterGlasses?.toString() ?? '')
  const [weightKg, setWeightKg] = useState(existingLog?.weightKg?.toString() ?? '')
  const [notes, setNotes] = useState(existingLog?.notes ?? '')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    setError('')
    try {
      const url = existingLog ? `/api/health/logs/${existingLog.id}` : '/api/health/logs'
      const method = existingLog ? 'PUT' : 'POST'
      // For PUT, omit the date since updateHealthLogSchema doesn't accept date
      const body: Record<string, unknown> = existingLog ? {} : { date }
      if (exerciseMins !== '') body.exerciseMins = parseInt(exerciseMins, 10)
      if (sleepHours !== '') body.sleepHours = parseFloat(sleepHours)
      if (waterGlasses !== '') body.waterGlasses = parseInt(waterGlasses, 10)
      if (weightKg !== '') body.weightKg = parseFloat(weightKg)
      if (notes.trim()) body.notes = notes.trim()

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      if (!res.ok) { setError('Failed to save log'); return }
      const data = await res.json() as { log: HealthLogData }
      onSaved(data.log)
    } finally {
      setSaving(false)
    }
  }

  const inputCls = 'w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400'

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-xs font-medium text-slate-600 mb-1">Date</label>
          <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className={inputCls} />
        </div>
        <div>
          <label className="block text-xs font-medium text-slate-600 mb-1">Exercise (mins)</label>
          <input type="number" min="0" max="1440" value={exerciseMins} onChange={(e) => setExerciseMins(e.target.value)} placeholder="e.g. 30" className={inputCls} />
        </div>
        <div>
          <label className="block text-xs font-medium text-slate-600 mb-1">Sleep (hours)</label>
          <input type="number" min="0" max="24" step="0.5" value={sleepHours} onChange={(e) => setSleepHours(e.target.value)} placeholder="e.g. 7.5" className={inputCls} />
        </div>
        <div>
          <label className="block text-xs font-medium text-slate-600 mb-1">Water (glasses)</label>
          <input type="number" min="0" max="50" value={waterGlasses} onChange={(e) => setWaterGlasses(e.target.value)} placeholder="e.g. 8" className={inputCls} />
        </div>
        <div>
          <label className="block text-xs font-medium text-slate-600 mb-1">Weight (kg)</label>
          <input type="number" min="0" max="500" step="0.1" value={weightKg} onChange={(e) => setWeightKg(e.target.value)} placeholder="e.g. 70.5" className={inputCls} />
        </div>
      </div>
      <div>
        <label className="block text-xs font-medium text-slate-600 mb-1">Notes</label>
        <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} placeholder="Optional notes..." className={inputCls + ' resize-none'} />
      </div>
      {error && <p className="text-sm text-red-600">{error}</p>}
      <Button type="submit" disabled={saving}>
        {saving ? 'Saving…' : 'Save Log'}
      </Button>
    </form>
  )
}
