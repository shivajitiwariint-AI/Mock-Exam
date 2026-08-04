'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import type { CompanyWithCounts, ExperienceData, InterviewQuestionData } from '@/types'
import Button from '@/components/ui/Button'
import Skeleton from '@/components/ui/Skeleton'
import CompanyModal from '@/components/interview/CompanyModal'
import type { CompanyData } from '@/types'

export default function InterviewPage() {
  const [companies, setCompanies] = useState<CompanyWithCounts[]>([])
  const [experiences, setExperiences] = useState<ExperienceData[]>([])
  const [questions, setQuestions] = useState<InterviewQuestionData[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [showAddCompany, setShowAddCompany] = useState(false)

  const load = useCallback(async () => {
    setIsLoading(true)
    try {
      const [cRes, eRes, qRes] = await Promise.all([
        fetch('/api/interview/companies'),
        fetch('/api/interview/experiences'),
        fetch('/api/interview/questions'),
      ])
      const [cData, eData, qData] = await Promise.all([
        cRes.json() as Promise<{ companies: CompanyWithCounts[] }>,
        eRes.json() as Promise<{ experiences: ExperienceData[] }>,
        qRes.json() as Promise<{ questions: InterviewQuestionData[] }>,
      ])
      setCompanies(cData.companies ?? [])
      setExperiences(eData.experiences ?? [])
      setQuestions(qData.questions ?? [])
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => { void load() }, [load])

  const practicedCount = questions.filter((q) => q.practiced).length

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Interview Intelligence</h1>
          <p className="text-sm text-slate-500 mt-0.5">Track companies, JDs, and AI-powered prep</p>
        </div>
        <Button onClick={() => setShowAddCompany(true)}>+ Add Company</Button>
      </div>

      {/* Stats */}
      {isLoading ? (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} height="80px" />)}
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { label: 'Companies', value: companies.length, href: '/interview/companies' },
            { label: 'Total Questions', value: questions.length, href: '/interview/questions' },
            { label: 'Practiced', value: practicedCount, href: '/interview/questions?practiced=true' },
            { label: 'Experiences', value: experiences.length, href: '/interview/experiences' },
          ].map((stat) => (
            <Link key={stat.label} href={stat.href} className="rounded-xl border border-slate-200 bg-white p-4 text-center shadow-sm hover:shadow-md transition-shadow">
              <p className="text-3xl font-bold text-slate-800">{stat.value}</p>
              <p className="text-xs text-slate-500 mt-1">{stat.label}</p>
            </Link>
          ))}
        </div>
      )}

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {[
          { icon: '🏢', label: 'Browse Companies', desc: 'Add JDs, generate AI questions', href: '/interview/companies' },
          { icon: '❓', label: 'Question Bank', desc: 'Practice and track questions', href: '/interview/questions' },
          { icon: '💼', label: 'My Experiences', desc: 'Log real interview rounds', href: '/interview/experiences' },
        ].map((action) => (
          <Link key={action.label} href={action.href} className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm hover:shadow-md hover:border-indigo-300 transition-all">
            <span className="text-3xl mb-2 block">{action.icon}</span>
            <p className="font-semibold text-slate-800">{action.label}</p>
            <p className="text-xs text-slate-500 mt-1">{action.desc}</p>
          </Link>
        ))}
      </div>

      {/* Recent Questions */}
      {!isLoading && questions.length > 0 && (
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-semibold text-slate-800">Recent Questions</h2>
            <Link href="/interview/questions" className="text-xs text-indigo-600 hover:text-indigo-800">View all →</Link>
          </div>
          <div className="space-y-2">
            {questions.slice(0, 5).map((q) => (
              <div key={q.id} className="flex items-center gap-2">
                <input type="checkbox" checked={q.practiced} readOnly className="h-3.5 w-3.5 text-green-600" />
                <p className="text-sm text-slate-700 truncate">{q.question}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {showAddCompany && (
        <CompanyModal
          onClose={() => setShowAddCompany(false)}
          onSave={(saved: CompanyData) => {
            setCompanies((prev) => [{ ...saved, _count: { jobDescs: 0, questions: 0, experiences: 0 } }, ...prev])
            setShowAddCompany(false)
          }}
        />
      )}
    </div>
  )
}
