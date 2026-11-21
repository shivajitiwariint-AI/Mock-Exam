'use client'

import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { registerSchema, type RegisterInput } from '@/lib/validations/auth.schema'
import { useUserStore } from '@/store/useUserStore'
import AuthShell from '@/components/layout/AuthShell'
import Toast from '@/components/ui/Toast'
import type { ToastType } from '@/types'

type ToastState = { message: string; type: ToastType } | null

const inputClass =
  'block h-10 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm placeholder:text-slate-400 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 disabled:cursor-not-allowed disabled:bg-slate-50'

export default function RegisterPage() {
  const router = useRouter()
  const fetchUser = useUserStore((s) => s.fetchUser)
  const [toast, setToast] = useState<ToastState>(null)

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<RegisterInput>({ resolver: zodResolver(registerSchema) })

  const onSubmit = async (data: RegisterInput) => {
    const res = await fetch('/api/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    })

    if (!res.ok) {
      const body = await res.json()
      setToast({ message: body.error ?? 'Registration failed', type: 'error' })
      return
    }

    await fetchUser()
    router.push('/dashboard')
  }

  return (
    <AuthShell>
      {toast && <Toast message={toast.message} type={toast.type} onDismiss={() => setToast(null)} />}

      <h1 className="mt-8 text-2xl font-semibold tracking-tight text-slate-900 lg:mt-0">Create account</h1>
      <p className="mt-1 text-sm text-slate-500">Start your growth journey today.</p>

      <form onSubmit={handleSubmit(onSubmit)} className="mt-6 space-y-4">
        <div className="space-y-1.5">
          <label htmlFor="name" className="block text-xs font-medium text-slate-700">Full Name</label>
          <input
            id="name"
            type="text"
            autoComplete="name"
            required
            placeholder="Your Name"
            className={inputClass}
            {...register('name')}
          />
          {errors.name?.message ? <p className="text-xs text-red-600">{errors.name.message}</p> : null}
        </div>

        <div className="space-y-1.5">
          <label htmlFor="email" className="block text-xs font-medium text-slate-700">Email</label>
          <input
            id="email"
            type="email"
            autoComplete="email"
            required
            placeholder="you@example.com"
            className={inputClass}
            {...register('email')}
          />
          {errors.email?.message ? <p className="text-xs text-red-600">{errors.email.message}</p> : null}
        </div>

        <div className="space-y-1.5">
          <label htmlFor="password" className="block text-xs font-medium text-slate-700">Password</label>
          <input
            id="password"
            type="password"
            autoComplete="new-password"
            required
            placeholder="Min. 8 characters"
            className={inputClass}
            {...register('password')}
          />
          {errors.password?.message ? <p className="text-xs text-red-600">{errors.password.message}</p> : null}
        </div>

        <button
          type="submit"
          disabled={isSubmitting}
          className="inline-flex h-10 w-full items-center justify-center gap-2 rounded-lg bg-indigo-600 px-4 text-sm font-medium text-white shadow-sm transition-all duration-200 hover:bg-indigo-500 active:scale-[0.98] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600 disabled:cursor-not-allowed disabled:bg-indigo-300"
        >
          {isSubmitting ? 'Creating account…' : 'Create account'}
        </button>
      </form>

      <p className="mt-6 text-sm text-slate-600">
        Already have an account?{' '}
        <Link href="/login" className="font-medium text-indigo-600 hover:text-indigo-500">
          Sign in
        </Link>
      </p>
    </AuthShell>
  )
}
