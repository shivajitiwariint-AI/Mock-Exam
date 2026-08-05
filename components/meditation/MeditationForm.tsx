'use client'

import { useState } from 'react'
import type { MeditationLogData } from '@/types'
import Button from '@/components/ui/Button'
import Modal from '@/components/ui/Modal'

type Props = {
  existing?: MeditationLogData
  onClose: () => void
  onSaved: (log: MeditationLogData) => void
}

export default function MeditationForm({ existing, onClose, onSaved }: Props) {
  const _now = new Date()
  const today = `${_now.getFullYear()}-${String(_now.getMonth() + 1).padStart(2, '0')}-${String(_now.getDate()).padStart(2, '0')}`
  const [date, setDate] = useState(existing ? existing.date.split('T')[0] : today)
  const [durationMins, setDurationMins] = useState(existing?.durationMins.toString() ?? '')
  const [reflection, setReflection] = useState(existing?.reflection ?? '')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!durationMins || parseInt(durationMins, 10) < 1) { setError('Duration is required (min 1 min)'); return }
    setSaving(true)
    setError('')
    try {
      const body = {
        date,
        durationMins: parseInt(durationMins, 10),
        ...(reflection.trim() ? { reflection: reflection.trim() } : {}),
      }
      const url = existing ? `/api/meditation/logs/${existing.id}` : '/api/meditation/logs'
      const method = existing ? 'PUT' : 'POST'
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      if (!res.ok) { setError('Failed to save session'); return }
      const data = await res.json() as { log: MeditationLogData }
      onSaved(data.log)
    } finally {
      setSaving(false)
    }
  }

  const inputCls = 'w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400'

  return (
    <Modal isOpen={true} title={existing ? 'Edit Session' : 'Log Meditation Session'} onClose={onClose}>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">Date</label>
            <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className={inputCls} required />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">Duration (mins)</label>
            <input type="number" min="1" max="1440" value={durationMins} onChange={(e) => setDurationMins(e.target.value)} placeholder="e.g. 20" className={inputCls} required />
          </div>
        </div>
        <div>
          <label className="block text-xs font-medium text-slate-600 mb-1">Reflection (optional)</label>
          <textarea value={reflection} onChange={(e) => setReflection(e.target.value)} rows={3} placeholder="How was your session?" className={inputCls + ' resize-none'} />
        </div>
        {error && <p className="text-sm text-red-600">{error}</p>}
        <div className="flex gap-2 justify-end">
          <Button variant="ghost" type="button" onClick={onClose}>Cancel</Button>
          <Button type="submit" disabled={saving}>{saving ? 'Saving…' : 'Save Session'}</Button>
        </div>
      </form>
    </Modal>
  )
}
