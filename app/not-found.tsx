import Link from 'next/link'

export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-slate-50 px-6 text-center">
      <div className="text-6xl font-bold text-slate-300" aria-hidden="true">
        404
      </div>
      <h1 className="text-2xl font-semibold text-slate-800">Page not found</h1>
      <p className="max-w-md text-sm text-slate-500">
        The page you are looking for does not exist or has been moved.
      </p>
      <Link
        href="/dashboard"
        className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-500"
      >
        Go to dashboard
      </Link>
    </div>
  )
}
