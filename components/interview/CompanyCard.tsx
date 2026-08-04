'use client'

import Link from 'next/link'
import type { CompanyWithCounts } from '@/types'
import Badge from '@/components/ui/Badge'

type Props = {
  company: CompanyWithCounts
  onEdit: (company: CompanyWithCounts) => void
  onDelete: (id: number) => void
}

export default function CompanyCard({ company, onEdit, onDelete }: Props) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between mb-3">
        <div>
          <h3 className="font-semibold text-slate-800 truncate">{company.name}</h3>
          {company.industry && (
            <p className="text-xs text-slate-500 mt-0.5">{company.industry}</p>
          )}
        </div>
        <div className="flex gap-1">
          <button
            onClick={() => onEdit(company)}
            className="p-1 text-slate-400 hover:text-slate-700 text-sm rounded"
            aria-label="Edit company"
          >✏️</button>
          <button
            onClick={() => onDelete(company.id)}
            className="p-1 text-slate-400 hover:text-red-500 text-sm rounded"
            aria-label="Delete company"
          >🗑️</button>
        </div>
      </div>

      <div className="flex gap-2 flex-wrap mb-4">
        <Badge label={`${company._count.jobDescs} JDs`} color="blue" />
        <Badge label={`${company._count.questions} questions`} color="amber" />
        <Badge label={`${company._count.experiences} interviews`} color="green" />
      </div>

      {company.website && (
        <p className="text-xs text-slate-400 truncate mb-3">🔗 {company.website}</p>
      )}

      <Link
        href={`/interview/companies/${company.id}`}
        className="block w-full text-center py-2 rounded-lg bg-indigo-50 text-indigo-700 text-sm font-medium hover:bg-indigo-100 transition-colors"
      >
        View Company →
      </Link>
    </div>
  )
}
