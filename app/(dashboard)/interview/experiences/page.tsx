'use client'

import { useState, useEffect, useCallback } from 'react'
import type { ExperienceWithRounds, CompanyData } from '@/types'
import ExperienceCard from '@/components/interview/ExperienceCard'
import Button from '@/components/ui/Button'
import Skeleton from '@/components/ui/Skeleton'
import Modal from '@/components/ui/Modal'
import Input from '@/components/ui/Input'

export default function ExperiencesPage() {
  const [experiences, setExperiences] = useState<ExperienceWithRounds[]>([])
  const [companies, setCompanies] = useState<CompanyData[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [showAdd, setShowAdd] = useState(false)
  const [showAddRound, setShowAddRound] = useState<number | null>(null)

  // Add experience form
  const [role, setRole] = useState('')
  const [companyId, setCompanyId] = useState('')
  const [date, setDate] = useState(new Date().toISOString().split('T')[0])
  const [status, setStatus] = useState('INTERVIEWING')
  const [notes, setNotes] = useState('')
  const [saving, setSaving] = useState(false)

  // Add round form
  const [roundType, setRoundType] = useState('TECHNICAL')
  const [roundNumber, setRoundNumber] = useState('1')
  const [roundNotes, setRoundNotes] = useState('')
  const [roundOutcome, setRoundOutcome] = useState('')
  const [savingRound, setSavingRound] = useState(false)

  const load = useCallback(async () => {
    setIsLoading(true)
    const [eRes, cRes] = await Promise.all([
      fetch('/api/interview/experiences'),
      fetch('/api/interview/companies'),
    ])
    const eData = await eRes.json() as { experiences: ExperienceWithRounds[] }
    const cData = await cRes.json() as { companies: CompanyData[] }
    setExperiences(eData.experiences ?? [])
    setCompanies(cData.companies ?? [])
    setIsLoading(false)
  }, [])

  useEffect(() => { void load() }, [load])

  const handleAdd = async () => {
    if (!role.trim()) return
    setSaving(true)
    const body: Record<string, unknown> = { role: role.trim(), date, status, notes: notes.trim() || undefined }
    if (companyId) body.companyId = parseInt(companyId, 10)

    const res = await fetch('/api/interview/experiences', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })
    if (res.ok) {
      const data = await res.json() as { experience: ExperienceWithRounds }
      setExperiences((prev) => [data.experience, ...prev])
      setRole(''); setCompanyId(''); setNotes(''); setStatus('INTERVIEWING')
      setShowAdd(false)
    }
    setSaving(false)
  }

  const handleDelete = async (id: number) => {
    if (!confirm('Delete this experience?')) return
    await fetch(`/api/interview/experiences/${id}`, { method: 'DELETE' })
    setExperiences((prev) => prev.filter((e) => e.id !== id))
  }

  const handleAddRound = async () => {
    if (!showAddRound) return
    setSavingRound(true)
    const res = await fetch(`/api/interview/experiences/${showAddRound}/rounds`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        type: roundType,
        roundNumber: parseInt(roundNumber, 10),
        notes: roundNotes.trim() || undefined,
        outcome: roundOutcome.trim() || undefined,
      }),
    })
    if (res.ok) {
      await load()
      setShowAddRound(null)
      setRoundNotes(''); setRoundOutcome(''); setRoundNumber('1'); setRoundType('TECHNICAL')
    }
    setSavingRound(false)
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Interview Experiences</h1>
          <p className="text-sm text-slate-500 mt-0.5">Track your real interview journey</p>
        </div>
        <Button onClick={() => setShowAdd(true)}>+ Log Experience</Button>
      </div>

      {isLoading ? (
        <div className="space-y-4">{Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} height="120px" />)}</div>
      ) : experiences.length === 0 ? (
        <div className="text-center py-16 rounded-xl border border-dashed border-slate-300 bg-slate-50">
          <span className="text-5xl mb-4 block">💼</span>
          <h3 className="text-lg font-semibold text-slate-700 mb-1">No experiences logged yet</h3>
          <p className="text-sm text-slate-500 mb-4">Log real interviews to track your progress and rounds.</p>
          <Button onClick={() => setShowAdd(true)}>+ Log Experience</Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {experiences.map((exp) => (
            <ExperienceCard
              key={exp.id}
              experience={exp}
              onDelete={handleDelete}
              onAddRound={(id) => { setShowAddRound(id); setRoundNumber(String((experiences.find((e) => e.id === id)?.rounds.length ?? 0) + 1)) }}
            />
          ))}
        </div>
      )}

      {showAdd && (
        <Modal isOpen onClose={() => setShowAdd(false)} title="Log Interview Experience">
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Role *</label>
              <Input value={role} onChange={(e) => setRole(e.target.value)} placeholder="e.g. Senior Frontend Engineer" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Company</label>
                <select value={companyId} onChange={(e) => setCompanyId(e.target.value)} className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500">
                  <option value="">— Select company —</option>
                  {companies.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Date</label>
                <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Status</label>
              <select value={status} onChange={(e) => setStatus(e.target.value)} className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500">
                {['APPLIED', 'SCREENING', 'INTERVIEWING', 'OFFER', 'REJECTED', 'WITHDRAWN'].map((s) => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Notes</label>
              <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} placeholder="Any notes…" className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
            </div>
            <div className="flex gap-2">
              <Button variant="secondary" onClick={() => setShowAdd(false)} className="flex-1">Cancel</Button>
              <Button onClick={handleAdd} disabled={saving || !role.trim()} className="flex-1">{saving ? 'Saving…' : 'Log Experience'}</Button>
            </div>
          </div>
        </Modal>
      )}

      {showAddRound !== null && (
        <Modal isOpen onClose={() => setShowAddRound(null)} title="Add Interview Round">
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Round Type</label>
                <select value={roundType} onChange={(e) => setRoundType(e.target.value)} className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500">
                  {['HR', 'TECHNICAL', 'SYSTEM_DESIGN', 'CODING', 'BEHAVIORAL', 'CASE_STUDY'].map((t) => <option key={t} value={t}>{t.replace('_', ' ')}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Round #</label>
                <Input type="number" value={roundNumber} onChange={(e) => setRoundNumber(e.target.value)} min={1} />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Outcome</label>
              <Input value={roundOutcome} onChange={(e) => setRoundOutcome(e.target.value)} placeholder="e.g. Passed, Rejected, Pending" />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Notes</label>
              <textarea value={roundNotes} onChange={(e) => setRoundNotes(e.target.value)} rows={3} placeholder="Questions asked, feedback received…" className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
            </div>
            <div className="flex gap-2">
              <Button variant="secondary" onClick={() => setShowAddRound(null)} className="flex-1">Cancel</Button>
              <Button onClick={handleAddRound} disabled={savingRound} className="flex-1">{savingRound ? 'Adding…' : 'Add Round'}</Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  )
}
