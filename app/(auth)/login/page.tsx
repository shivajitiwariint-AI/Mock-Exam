'use client'

import { useState, Suspense } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { loginSchema, type LoginInput } from '@/lib/validations/auth.schema'
import { useUserStore } from '@/store/useUserStore'
import Input from '@/components/ui/Input'
import Button from '@/components/ui/Button'
import Toast from '@/components/ui/Toast'
import type { ToastType } from '@/types'

type ToastState = { message: string; type: ToastType } | null

function LoginContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const fetchUser = useUserStore((s) => s.fetchUser)
  const [toast, setToast] = useState<ToastState>(
    searchParams.get('reason') === 'session_expired'
      ? { message: 'Your session expired. Please log in again.', type: 'info' }
      : null
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
    router.push('/dashboard')
  }

  return (
    <div className="w-full max-w-sm">
      {toast && <Toast message={toast.message} type={toast.type} onDismiss={() => setToast(null)} />}

      <div className="rounded-2xl bg-white p-8 shadow-xl">
        <div className="mb-6 text-center">
          <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-xl bg-accent text-white font-bold text-xl">
            P
          </div>
          <h1 className="text-2xl font-bold text-slate-800">Welcome back</h1>
          <p className="mt-1 text-sm text-slate-500">Sign in to your PGCIP account</p>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <Input
            label="Email"
            type="email"
            placeholder="you@example.com"
            error={errors.email?.message}
            {...register('email')}
          />
          <Input
            label="Password"
            type="password"
            placeholder="••••••••"
            error={errors.password?.message}
            {...register('password')}
          />
          <Button type="submit" loading={isSubmitting} className="w-full">
            Sign In
          </Button>
        </form>

        <p className="mt-4 text-center text-sm text-slate-500">
          Don&apos;t have an account?{' '}
          <Link href="/register" className="font-medium text-accent hover:underline">
            Register
          </Link>
        </p>
      </div>
    </div>
  )
}

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="w-full max-w-sm"><div className="rounded-2xl bg-white p-8 shadow-xl animate-pulse h-80" /></div>}>
      <LoginContent />
    </Suspense>
  )
}
