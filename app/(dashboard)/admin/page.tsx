'use client'

import { useEffect, useState } from 'react'
import { useUserStore } from '@/store/useUserStore'
import { useRouter } from 'next/navigation'
import Skeleton from '@/components/ui/Skeleton'
import Button from '@/components/ui/Button'

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

function ScoreBar({ value }: { value: number }) {
  const color =
    value >= 70 ? 'bg-emerald-500' : value >= 40 ? 'bg-amber-500' : 'bg-rose-500'
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-1.5 rounded-full bg-slate-100">
        <div className={`h-1.5 rounded-full ${color}`} style={{ width: `${value}%` }} />
      </div>
      <span className="text-xs font-medium text-slate-700 w-6 text-right">{value}</span>
    </div>
  )
}

export default function AdminPage() {
  const { user, isLoading } = useUserStore()
  const router = useRouter()
  const [users, setUsers] = useState<AdminUser[]>([])
  const [loading, setLoading] = useState(true)
  const [deleting, setDeleting] = useState<number | null>(null)

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

  const handleDelete = async (id: number, email: string) => {
    if (!confirm(`Delete user ${email} and all their data? This cannot be undone.`)) return
    setDeleting(id)
    try {
      const res = await fetch(`/api/admin/growth-users?id=${id}`, { method: 'DELETE' })
      if (res.ok) setUsers((prev) => prev.filter((u) => u.id !== id))
    } finally {
      setDeleting(null)
    }
  }

  if (isLoading || loading) {
    return (
      <div className="space-y-4">
        <Skeleton height="2rem" width="200px" />
        <Skeleton height="400px" />
      </div>
    )
  }

  const regularUsers = users.filter((u) => !u.isAdmin)
  const avgScore = regularUsers.length
    ? Math.round(regularUsers.reduce((s, u) => s + u.score.total, 0) / regularUsers.length)
    : 0

  const topScorers = [...regularUsers].sort((a, b) => b.score.total - a.score.total).slice(0, 3)

  const platformStats = [
    { label: 'Total Users', value: regularUsers.length },
    { label: 'Avg Growth Score', value: avgScore },
    { label: 'Top Score', value: topScorers[0]?.score.total ?? 0 },
    { label: 'Admin Accounts', value: users.filter((u) => u.isAdmin).length },
  ]

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-800">User Management</h1>
        <p className="text-sm text-slate-500 mt-0.5">Monitor all users and their personal growth scores</p>
      </div>

      {/* Platform Stats */}
      <div>
        <h2 className="text-sm font-semibold text-slate-600 uppercase tracking-wide mb-3">Platform Overview</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {platformStats.map((stat) => (
            <div key={stat.label} className="rounded-xl border border-slate-200 bg-white p-4 text-center shadow-sm">
              <p className="text-2xl font-bold text-slate-800">{stat.value}</p>
              <p className="text-xs text-slate-500 mt-0.5">{stat.label}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Growth Score Table */}
      <div>
        <h2 className="text-sm font-semibold text-slate-600 uppercase tracking-wide mb-3">
          User Growth Details ({regularUsers.length})
        </h2>
        <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-x-auto">
          <table className="w-full text-sm min-w-[900px]">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="px-4 py-3 text-left font-medium text-slate-600">User</th>
                <th className="px-4 py-3 text-center font-medium text-slate-600">Overall</th>
                <th className="px-4 py-3 font-medium text-slate-600 min-w-[120px]">Education</th>
                <th className="px-4 py-3 font-medium text-slate-600 min-w-[120px]">Career</th>
                <th className="px-4 py-3 font-medium text-slate-600 min-w-[120px]">Interview</th>
                <th className="px-4 py-3 font-medium text-slate-600 min-w-[120px]">Health</th>
                <th className="px-4 py-3 font-medium text-slate-600 min-w-[120px]">Meditation</th>
                <th className="px-4 py-3 text-center font-medium text-slate-600">Joined</th>
                <th className="px-4 py-3 text-center font-medium text-slate-600">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {regularUsers.map((u) => (
                <tr key={u.id} className="hover:bg-slate-50 transition-colors">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-700 font-semibold text-xs flex-shrink-0">
                        {(u.profile?.name ?? u.email)[0].toUpperCase()}
                      </div>
                      <div>
                        <p className="font-medium text-slate-800">{u.profile?.name ?? '—'}</p>
                        <p className="text-xs text-slate-500">{u.email}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-center">
                    <span
                      className={`inline-block text-sm font-bold px-2.5 py-0.5 rounded-full ${
                        u.score.total >= 70
                          ? 'bg-emerald-100 text-emerald-700'
                          : u.score.total >= 40
                          ? 'bg-amber-100 text-amber-700'
                          : 'bg-rose-100 text-rose-700'
                      }`}
                    >
                      {u.score.total}
                    </span>
                  </td>
                  <td className="px-4 py-3"><ScoreBar value={u.score.education} /></td>
                  <td className="px-4 py-3"><ScoreBar value={u.score.career} /></td>
                  <td className="px-4 py-3"><ScoreBar value={u.score.interviewReadiness} /></td>
                  <td className="px-4 py-3"><ScoreBar value={u.score.health} /></td>
                  <td className="px-4 py-3"><ScoreBar value={u.score.meditation} /></td>
                  <td className="px-4 py-3 text-center text-slate-500 text-xs">
                    {new Date(u.createdAt).toLocaleDateString()}
                  </td>
                  <td className="px-4 py-3 text-center">
                    <Button
                      variant="danger"
                      onClick={() => handleDelete(u.id, u.email)}
                      disabled={deleting === u.id}
                    >
                      {deleting === u.id ? '…' : 'Delete'}
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
