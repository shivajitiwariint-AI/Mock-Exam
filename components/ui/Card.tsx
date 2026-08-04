import { ReactNode } from 'react'

type CardProps = {
  title?: string
  children: ReactNode
  className?: string
  gradient?: boolean
}

export default function Card({ title, children, className = '', gradient = false }: CardProps) {
  return (
    <div
      className={`rounded-xl border border-slate-200 bg-white p-6 shadow-sm ${
        gradient ? 'bg-gradient-to-br from-white to-slate-50' : ''
      } ${className}`}
    >
      {title && <h3 className="mb-4 text-base font-semibold text-slate-800">{title}</h3>}
      {children}
    </div>
  )
}
