'use client'

import Link from 'next/link'

type Props = {
  label: string
  score: number
  weight: string
  color: string
  href: string
}

export default function SubScoreCard({ label, score, weight, color, href }: Props) {
  return (
    <Link href={href} className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm hover:shadow-md transition-shadow block">
      <div className="flex items-center justify-between mb-2">
        <span className="text-sm font-semibold text-slate-700">{label}</span>
        <span className="text-xs text-slate-400 font-medium">{weight}</span>
      </div>
      <p className="text-2xl font-bold text-slate-800 mb-2">{score}<span className="text-sm font-normal text-slate-400">/100</span></p>
      <div className="h-1.5 w-full rounded-full bg-slate-100">
        <div
          className="h-1.5 rounded-full transition-all"
          style={{ width: `${score}%`, backgroundColor: color }}
        />
      </div>
    </Link>
  )
}
