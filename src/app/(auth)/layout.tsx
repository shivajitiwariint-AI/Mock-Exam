import Link from "next/link";
import { redirect } from "next/navigation";
import type { ReactNode } from "react";
import { auth } from "@/auth";

export default async function AuthLayout({ children }: { children: ReactNode }) {
  const session = await auth();
  if (session?.user?.id) {
    redirect(session.user.role === "STUDENT" ? "/dashboard" : "/admin");
  }

  return (
    <div className="grid min-h-screen bg-white lg:grid-cols-2">
      <aside className="relative hidden overflow-hidden bg-slate-950 p-10 text-white lg:flex lg:flex-col lg:justify-between">
        <div
          className="pointer-events-none absolute inset-0 bg-[radial-gradient(80%_60%_at_20%_0%,#4338ca_0%,transparent_60%),radial-gradient(60%_60%_at_100%_100%,#7c3aed_0%,transparent_55%)]"
          aria-hidden="true"
        />
        <div className="relative">
          <Link href="/" className="flex items-center gap-2.5">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/10 text-sm font-bold">
              E
            </span>
            <span className="text-sm font-semibold tracking-tight">ExamForge</span>
          </Link>
        </div>
        <div className="relative max-w-md">
          <p className="text-3xl font-semibold leading-tight tracking-tight">
            Turn course material into deliberate practice.
          </p>
          <p className="mt-4 text-sm leading-6 text-slate-300">
            Timed exams, reviewed AI question drafts, and analytics that point at the topics you
            actually need to revisit.
          </p>
          <ul className="mt-8 space-y-3 text-sm text-slate-300">
            <li className="flex items-center gap-2">
              <span className="h-1.5 w-1.5 rounded-full bg-indigo-400" aria-hidden="true" />
              Server-enforced exam timing and scoring
            </li>
            <li className="flex items-center gap-2">
              <span className="h-1.5 w-1.5 rounded-full bg-indigo-400" aria-hidden="true" />
              RAG study answers with source citations
            </li>
            <li className="flex items-center gap-2">
              <span className="h-1.5 w-1.5 rounded-full bg-indigo-400" aria-hidden="true" />
              Subject-scoped admin permissions
            </li>
          </ul>
        </div>
        <p className="relative text-xs text-slate-500">
          AI-generated questions never publish without human review.
        </p>
      </aside>

      <div className="flex min-h-screen items-center justify-center px-4 py-12 sm:px-8">
        <div className="w-full max-w-md">{children}</div>
      </div>
    </div>
  );
}
