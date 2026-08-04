type BadgeColor = 'amber' | 'green' | 'red' | 'blue' | 'slate'

type BadgeProps = {
  label: string
  color?: BadgeColor
}

const colorClasses: Record<BadgeColor, string> = {
  amber: 'bg-amber-100 text-amber-800',
  green: 'bg-emerald-100 text-emerald-800',
  red: 'bg-red-100 text-red-800',
  blue: 'bg-blue-100 text-blue-800',
  slate: 'bg-slate-100 text-slate-700',
}

export default function Badge({ label, color = 'slate' }: BadgeProps) {
  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${colorClasses[color]}`}>
      {label}
    </span>
  )
}
