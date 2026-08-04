'use client'

type Props = {
  label: string
  value: number | null
  target: number
  unit: string
  color: string
}

export default function MetricBar({ label, value, target, unit, color }: Props) {
  const pct = Math.min(((value ?? 0) / target) * 100, 100)
  const met = (value ?? 0) >= target

  return (
    <div className="space-y-1">
      <div className="flex justify-between text-sm">
        <span className="font-medium text-slate-700">{label}</span>
        <span className={`font-semibold ${met ? 'text-green-600' : 'text-slate-500'}`}>
          {value !== null ? `${value} ${unit}` : `— ${unit}`}
          {' '}/ {target} {unit}
        </span>
      </div>
      <div className="h-2 w-full rounded-full bg-slate-100">
        <div
          className={`h-2 rounded-full transition-all ${color}`}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  )
}
