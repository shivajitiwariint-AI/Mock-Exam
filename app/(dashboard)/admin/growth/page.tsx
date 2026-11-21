'use client'

import { useEffect, useState } from 'react'
import { useUserStore } from '@/store/useUserStore'
import { useRouter } from 'next/navigation'
import Skeleton from '@/components/ui/Skeleton'

type GrowthScore = {
  total: number
  education: number
  career: number
  interviewReadiness: number
  health: number
  meditation: number
}

type AdminUser = {
  id: number
  email: string
  isAdmin: boolean
  createdAt: string
  profile: { name: string; avatar: string | null } | null
  score: GrowthScore
}

const SCORE_CATEGORIES = [
  { key: 'total' as const, label: 'Overall', weight: null, color: 'indigo' },
  { key: 'education' as const, label: 'Education', weight: '35%', color: 'blue' },
  { key: 'career' as const, label: 'Career', weight: '25%', color: 'violet' },
  { key: 'interviewReadiness' as const, label: 'Interview', weight: '15%', color: 'purple' },
  { key: 'health' as const, label: 'Health', weight: '15%', color: 'rose' },
  { key: 'meditation' as const, label: 'Meditation', weight: '10%', color: 'teal' },
]

function avg(users: AdminUser[], key: keyof GrowthScore) {
  if (!users.length) return 0
  return Math.round(users.reduce((s, u) => s + u.score[key], 0) / users.length)
}

export default function GrowthReportsPage() {
  const { user, isLoading } = useUserStore()
  const router = useRouter()
  const [users, setUsers] = useState<AdminUser[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!isLoading && user && !user.isAdmin) {
      router.replace('/dashboard')
    }
  }, [user, isLoading, router])

  useEffect(() => {
    fetch('/api/admin/growth-users')
      .then((r) => r.json())
      .then((d: { users: AdminUser[] }) => setUsers(d.users ?? []))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  if (isLoading || loading) {
    return (
      <div className="space-y-4">
        <Skeleton height="2rem" width="250px" />
        <Skeleton height="300px" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-800">Growth Reports</h1>
        <p className="text-sm text-slate-500 mt-0.5">Platform-wide growth score analytics across all {users.length} users</p>
      </div>

      {/* Category Averages */}
      <div>
        <h2 className="text-sm font-semibold text-slate-600 uppercase tracking-wide mb-3">Platform Averages</h2>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
          {SCORE_CATEGORIES.map((cat) => {
            const val = avg(users, cat.key)
            const color =
              val >= 70 ? 'text-emerald-600 bg-emerald-50' : val >= 40 ? 'text-amber-600 bg-amber-50' : 'text-rose-600 bg-rose-50'
            return (
              <div key={cat.key} className="rounded-xl border border-slate-200 bg-white p-4 text-center shadow-sm">
                <p className={`text-2xl font-bold ${color} rounded-lg py-1`}>{val}</p>
                <p className="text-xs font-medium text-slate-700 mt-1">{cat.label}</p>
                {cat.weight && <p className="text-xs text-slate-400">{cat.weight} weight</p>}
              </div>
            )
          })}
        </div>
      </div>

      {/* Score Distribution */}
      <div>
        <h2 className="text-sm font-semibold text-slate-600 uppercase tracking-wide mb-3">Score Distribution</h2>
        <div className="grid grid-cols-3 gap-3">
          {[
            { label: 'High (70–100)', count: users.filter((u) => u.score.total >= 70).length, color: 'text-emerald-600 bg-emerald-50' },
            { label: 'Mid (40–69)', count: users.filter((u) => u.score.total >= 40 && u.score.total < 70).length, color: 'text-amber-600 bg-amber-50' },
            { label: 'Low (0–39)', count: users.filter((u) => u.score.total < 40).length, color: 'text-rose-600 bg-rose-50' },
          ].map((tier) => (
            <div key={tier.label} className="rounded-xl border border-slate-200 bg-white p-4 text-center shadow-sm">
              <p className={`text-3xl font-bold ${tier.color} rounded-lg py-1`}>{tier.count}</p>
              <p className="text-xs text-slate-500 mt-1">{tier.label}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Per-Category Breakdown */}
      <div>
        <h2 className="text-sm font-semibold text-slate-600 uppercase tracking-wide mb-3">Category Breakdown by User</h2>
        <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-x-auto">
          <table className="w-full text-sm min-w-[700px]">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="px-4 py-3 text-left font-medium text-slate-600">User</th>
                {SCORE_CATEGORIES.map((c) => (
                  <th key={c.key} className="px-4 py-3 text-center font-medium text-slate-600">
                    {c.label}
                    {c.weight && <span className="block text-xs text-slate-400 font-normal">{c.weight}</span>}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {[...users]
                .sort((a, b) => b.score.total - a.score.total)
                .map((u) => (
                  <tr key={u.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-4 py-3">
                      <p className="font-medium text-slate-800">{u.profile?.name ?? '—'}</p>
                      <p className="text-xs text-slate-500">{u.email}</p>
                    </td>
                    {SCORE_CATEGORIES.map((cat) => {
                      const val = u.score[cat.key]
                      const cls =
                        val >= 70
                          ? 'text-emerald-700 bg-emerald-50'
                          : val >= 40
                          ? 'text-amber-700 bg-amber-50'
                          : 'text-rose-700 bg-rose-50'
                      return (
                        <td key={cat.key} className="px-4 py-3 text-center">
                          <span className={`inline-block text-xs font-bold px-2 py-0.5 rounded-full ${cls}`}>{val}</span>
                        </td>
                      )
                    })}
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
