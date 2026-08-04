'use client'

import { useState, useEffect, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import type { CompanyData, JobDescriptionWithQuestionCount } from '@/types'
import JdCard from '@/components/interview/JdCard'
import Button from '@/components/ui/Button'
import Input from '@/components/ui/Input'
import Skeleton from '@/components/ui/Skeleton'
import Modal from '@/components/ui/Modal'

type CompanyDetail = CompanyData & {
  jobDescs: JobDescriptionWithQuestionCount[]
  _count: { questions: number; experiences: number }
}

export default function CompanyDetailPage() {
  const params = useParams<{ id: string }>()
  const router = useRouter()
  const companyId = parseInt(params.id, 10)

  const [company, setCompany] = useState<CompanyDetail | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [showAddJd, setShowAddJd] = useState(false)
  const [jdRole, setJdRole] = useState('')
  const [jdText, setJdText] = useState('')
  const [jdSkills, setJdSkills] = useState('')
  const [savingJd, setSavingJd] = useState(false)
  const [generatingForJd, setGeneratingForJd] = useState<number | null>(null)
  const [generateResult, setGenerateResult] = useState<{ count: number; jdId: number } | null>(null)

  const load = useCallback(async () => {
    setIsLoading(true)
    const res = await fetch(`/api/interview/companies/${companyId}`)
    if (!res.ok) { router.push('/interview/companies'); return }
    const data = await res.json() as { company: CompanyDetail }
    setCompany(data.company)
    setIsLoading(false)
  }, [companyId, router])

  useEffect(() => { void load() }, [load])

  const handleAddJd = async () => {
    if (!jdRole.trim() || !jdText.trim()) return
    setSavingJd(true)
    const skills = jdSkills.split(',').map((s) => s.trim()).filter(Boolean)
    const res = await fetch(`/api/interview/companies/${companyId}/jds`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ role: jdRole.trim(), jdText: jdText.trim(), requiredSkills: skills.length ? skills : ['General'] }),
    })
    if (res.ok) {
      const data = await res.json() as { jd: JobDescriptionWithQuestionCount }
      setCompany((prev) => prev ? { ...prev, jobDescs: [data.jd, ...prev.jobDescs] } : prev)
      setJdRole(''); setJdText(''); setJdSkills('')
      setShowAddJd(false)
    }
    setSavingJd(false)
  }

  const handleDeleteJd = async (jdId: number) => {
    if (!confirm('Delete this JD and its generated questions?')) return
    await fetch(`/api/interview/jds/${jdId}`, { method: 'DELETE' })
    setCompany((prev) => prev ? { ...prev, jobDescs: prev.jobDescs.filter((j) => j.id !== jdId) } : prev)
  }

  const handleGenerateQuestions = async (jdId: number) => {
    setGeneratingForJd(jdId)
    const res = await fetch('/api/ai/jd-questions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ companyId, jdId }),
    })
    if (res.ok) {
      const data = await res.json() as { count: number }
      setGenerateResult({ count: data.count, jdId })
      setCompany((prev) => {
        if (!prev) return prev
        return {
          ...prev,
          jobDescs: prev.jobDescs.map((j) =>
            j.id === jdId ? { ...j, _count: { questions: j._count.questions + data.count } } : j
          ),
        }
      })
    } else {
      const err = await res.json() as { error: string }
      alert(err.error ?? 'AI generation failed')
    }
    setGeneratingForJd(null)
  }

  const handleViewQuestions = (jdId: number) => {
    router.push(`/interview/questions?jdId=${jdId}`)
  }

  if (isLoading) return <div className="space-y-4"><Skeleton height="100px" /><Skeleton height="300px" /></div>
  if (!company) return null

  return (
    <div className="space-y-6">
      <Link href="/interview/companies" className="text-sm text-slate-500 hover:text-slate-700">← Back to Companies</Link>

      {/* Company header */}
      <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-xl font-bold text-slate-800">{company.name}</h1>
            {company.industry && <p className="text-sm text-slate-500 mt-0.5">{company.industry}</p>}
            {company.website && <a href={company.website} target="_blank" rel="noopener noreferrer" className="text-xs text-indigo-600 hover:underline mt-1 block">{company.website}</a>}
            {company.notes && <p className="text-sm text-slate-600 mt-2 italic">{company.notes}</p>}
          </div>
          <div className="flex gap-2 text-sm text-slate-500">
            <span>{company._count.questions} questions</span>
            <span>·</span>
            <span>{company._count.experiences} interviews</span>
          </div>
        </div>
      </div>

      {/* AI note if no API key */}
      <div className="rounded-lg bg-amber-50 border border-amber-200 p-3 text-sm text-amber-800">
        <strong>AI question generation</strong> requires <code>ANTHROPIC_API_KEY</code> in <code>.env.local</code>. Without it, you can still add JDs and questions manually.
      </div>

      {/* Job Descriptions */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-base font-semibold text-slate-800">Job Descriptions ({company.jobDescs.length})</h2>
          <Button onClick={() => setShowAddJd(true)}>+ Add JD</Button>
        </div>

        <div className="space-y-3">
          {company.jobDescs.map((jd) => (
            <div key={jd.id} className={generatingForJd === jd.id ? 'opacity-75 pointer-events-none' : ''}>
              <JdCard
                jd={jd}
                onDelete={handleDeleteJd}
                onGenerateQuestions={handleGenerateQuestions}
                onViewQuestions={handleViewQuestions}
              />
            </div>
          ))}

          {company.jobDescs.length === 0 && !showAddJd && (
            <div className="text-center py-8 rounded-lg border border-dashed border-slate-300 text-slate-400 text-sm">
              No job descriptions yet. Add a JD to generate AI interview questions.
            </div>
          )}
        </div>
      </div>

      {/* AI result toast */}
      {generateResult && (
        <div className="rounded-lg bg-green-50 border border-green-200 p-4">
          <p className="text-green-800 font-medium">Generated {generateResult.count} questions from the JD!</p>
          <button
            onClick={() => router.push(`/interview/questions?jdId=${generateResult.jdId}`)}
            className="text-sm text-green-700 underline mt-1"
          >
            View generated questions →
          </button>
        </div>
      )}

      {/* Add JD Modal */}
      {showAddJd && (
        <Modal isOpen onClose={() => setShowAddJd(false)} title="Add Job Description">
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Role / Position *</label>
              <Input value={jdRole} onChange={(e) => setJdRole(e.target.value)} placeholder="e.g. Senior Frontend Engineer" />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Required Skills (comma-separated)</label>
              <Input value={jdSkills} onChange={(e) => setJdSkills(e.target.value)} placeholder="React, TypeScript, Node.js" />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Job Description Text *</label>
              <textarea
                value={jdText}
                onChange={(e) => setJdText(e.target.value)}
                rows={8}
                placeholder="Paste the full job description here…"
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-y"
              />
            </div>
            <div className="flex gap-2">
              <Button variant="secondary" onClick={() => setShowAddJd(false)} className="flex-1">Cancel</Button>
              <Button onClick={handleAddJd} disabled={savingJd || !jdRole.trim() || !jdText.trim()} className="flex-1">
                {savingJd ? 'Saving…' : 'Add JD'}
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  )
}
