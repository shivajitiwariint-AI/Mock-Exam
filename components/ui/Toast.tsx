'use client'

import { useEffect } from 'react'
import type { ToastType } from '@/types'

type ToastProps = {
  message: string
  type: ToastType
  onDismiss: () => void
  duration?: number
}

const typeClasses: Record<ToastType, string> = {
  success: 'bg-emerald-600 text-white',
  error: 'bg-red-600 text-white',
  info: 'bg-slate-700 text-white',
}

const typeIcons: Record<ToastType, string> = {
  success: '✓',
  error: '✕',
  info: 'ℹ',
}

export default function Toast({ message, type, onDismiss, duration = 3000 }: ToastProps) {
  useEffect(() => {
    const timer = setTimeout(onDismiss, duration)
    return () => clearTimeout(timer)
  }, [onDismiss, duration])

  return (
    <div
      className={`fixed bottom-6 right-6 z-50 flex items-center gap-3 rounded-lg px-4 py-3 shadow-lg ${typeClasses[type]}`}
    >
      <span className="text-sm font-semibold">{typeIcons[type]}</span>
      <span className="text-sm">{message}</span>
      <button onClick={onDismiss} className="ml-2 text-sm opacity-75 hover:opacity-100">
        ✕
      </button>
    </div>
  )
}
