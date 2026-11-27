'use client'

import { useEffect, useRef } from 'react'
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
  const dismissRef = useRef(onDismiss)
  dismissRef.current = onDismiss

  useEffect(() => {
    const timer = setTimeout(() => dismissRef.current(), duration)
    return () => clearTimeout(timer)
  }, [duration])

  return (
    <div
      role="status"
      aria-live="polite"
      className={`fixed bottom-4 left-1/2 z-50 flex max-w-[calc(100vw-2rem)] -translate-x-1/2 items-center gap-3 rounded-lg px-4 py-3 shadow-lg sm:bottom-6 sm:right-6 sm:left-auto sm:translate-x-0 ${typeClasses[type]}`}
    >
      <span className="text-sm font-semibold" aria-hidden="true">
        {typeIcons[type]}
      </span>
      <span className="text-sm">{message}</span>
      <button
        type="button"
        onClick={onDismiss}
        aria-label="Dismiss notification"
        className="ml-2 text-sm opacity-75 hover:opacity-100"
      >
        ✕
      </button>
    </div>
  )
}
