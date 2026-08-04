import Link from 'next/link'
import type { ModuleSummary } from '@/types'

export default function ModuleSummaryCard({ name, icon, stat, href, color }: ModuleSummary) {
  return (
    <Link href={href}>
      <div className="flex flex-col items-center justify-center rounded-xl border border-slate-200 bg-white p-4 shadow-sm transition-all hover:shadow-md hover:border-accent/40 cursor-pointer min-h-[100px]">
        <span className="text-2xl mb-2">{icon}</span>
        <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">{name}</p>
        <p className="mt-1 text-xl font-bold" style={{ color }}>{stat}</p>
      </div>
    </Link>
  )
}
