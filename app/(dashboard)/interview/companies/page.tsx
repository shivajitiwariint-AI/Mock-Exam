'use client'

import { useState, useEffect, useCallback } from 'react'
import type { CompanyWithCounts, CompanyData } from '@/types'
import CompanyCard from '@/components/interview/CompanyCard'
import CompanyModal from '@/components/interview/CompanyModal'
import Button from '@/components/ui/Button'
import Skeleton from '@/components/ui/Skeleton'

export default function CompaniesPage() {
  const [companies, setCompanies] = useState<CompanyWithCounts[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [editing, setEditing] = useState<CompanyWithCounts | undefined>()

  const load = useCallback(async () => {
    setIsLoading(true)
    const res = await fetch('/api/interview/companies')
    const data = await res.json() as { companies: CompanyWithCounts[] }
    setCompanies(data.companies ?? [])
    setIsLoading(false)
  }, [])

  useEffect(() => { void load() }, [load])

  const handleSave = (saved: CompanyData) => {
    setCompanies((prev) => {
      const exists = prev.find((c) => c.id === saved.id)
      if (exists) return prev.map((c) => c.id === saved.id ? { ...c, ...saved } : c)
      return [{ ...saved, _count: { jobDescs: 0, questions: 0, experiences: 0 } }, ...prev]
    })
    setEditing(undefined)
  }

  const handleDelete = async (id: number) => {
    if (!confirm('Delete this company and all its data?')) return
    await fetch(`/api/interview/companies/${id}`, { method: 'DELETE' })
    setCompanies((prev) => prev.filter((c) => c.id !== id))
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-slate-800">Companies</h1>
        <Button onClick={() => { setEditing(undefined); setShowModal(true) }}>+ Add Company</Button>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} height="180px" />)}
        </div>
      ) : companies.length === 0 ? (
        <div className="text-center py-16 rounded-xl border border-dashed border-slate-300 bg-slate-50">
          <span className="text-5xl mb-4 block">🏢</span>
          <h3 className="text-lg font-semibold text-slate-700 mb-1">No companies yet</h3>
          <p className="text-sm text-slate-500 mb-4">Add companies to track JDs and generate interview questions.</p>
          <Button onClick={() => setShowModal(true)}>+ Add Company</Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {companies.map((company) => (
            <CompanyCard
              key={company.id}
              company={company}
              onEdit={(c) => { setEditing(c); setShowModal(true) }}
              onDelete={handleDelete}
            />
          ))}
        </div>
      )}

      {showModal && (
        <CompanyModal
          company={editing}
          onClose={() => { setShowModal(false); setEditing(undefined) }}
          onSave={handleSave}
        />
      )}
    </div>
  )
}
