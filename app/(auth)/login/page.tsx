'use client'

import { useState, Suspense } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { loginSchema, type LoginInput } from '@/lib/validations/auth.schema'
import { useUserStore } from '@/store/useUserStore'
import AuthShell from '@/components/layout/AuthShell'
import Toast from '@/components/ui/Toast'
import type { ToastType } from '@/types'

type ToastState = { message: string; type: ToastType } | null

const inputClass =
  'block h-10 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm placeholder:text-slate-400 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 disabled:cursor-not-allowed disabled:bg-slate-50'

function LoginContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const fetchUser = useUserStore((s) => s.fetchUser)
  const [toast, setToast] = useState<ToastState>(
    searchParams.get('reason') === 'session_expired'
      ? { message: 'Your session expired. Please log in again.', type: 'info' }
      : null,
  )

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginInput>({ resolver: zodResolver(loginSchema) })

  const onSubmit = async (data: LoginInput) => {
    const res = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    })

    if (!res.ok) {
      const body = await res.json()
      setToast({ message: body.error ?? 'Login failed', type: 'error' })
      return
    }

    await fetchUser()
    const me = await fetch('/api/auth/me').then((r) => r.ok ? r.json() : null)
    router.push(me?.isAdmin ? '/admin' : '/dashboard')
  }

  return (
    <>
      {toast && <Toast message={toast.message} type={toast.type} onDismiss={() => setToast(null)} />}

      <h1 className="mt-8 text-2xl font-semibold tracking-tight text-slate-900 lg:mt-0">Welcome back</h1>
      <p className="mt-1 text-sm text-slate-500">Sign in with your email and password to continue.</p>

      <form onSubmit={handleSubmit(onSubmit)} className="mt-6 space-y-4">
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
            autoComplete="current-password"
            required
            placeholder="Your password"
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
          {isSubmitting ? 'Signing in…' : 'Sign in'}
        </button>
      </form>

      <p className="mt-6 text-sm text-slate-600">
        New here?{' '}
        <Link href="/register" className="font-medium text-indigo-600 hover:text-indigo-500">
          Create a student account
        </Link>
      </p>
    </>
  )
}

function LoginSkeleton() {
  return (
    <div className="mt-8 animate-pulse space-y-4 lg:mt-0">
      <div className="h-7 w-40 rounded bg-slate-200" />
      <div className="h-4 w-72 rounded bg-slate-100" />
      <div className="space-y-2 pt-2">
        <div className="h-4 w-16 rounded bg-slate-100" />
        <div className="h-10 w-full rounded-lg bg-slate-100" />
        <div className="h-4 w-20 rounded bg-slate-100" />
        <div className="h-10 w-full rounded-lg bg-slate-100" />
        <div className="h-10 w-full rounded-lg bg-slate-200" />
      </div>
    </div>
  )
}

export default function LoginPage() {
  return (
    <AuthShell>
      <Suspense fallback={<LoginSkeleton />}>
        <LoginContent />
      </Suspense>
    </AuthShell>
  )
}
