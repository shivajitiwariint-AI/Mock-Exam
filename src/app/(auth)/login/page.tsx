"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { signIn } from "next-auth/react";
import { useState } from "react";
import { apiFetch, getErrorMessage } from "@/lib/client-api";
import { Alert, Button, Field, Input } from "@/components/ui";
import type { SessionUser } from "@/types/api";

const DEMO_ACCOUNTS = [
  { label: "Student", email: "student@example.com", password: "Student12345!" },
  { label: "Subject admin", email: "subjectadmin@example.com", password: "Subject12345!" },
  { label: "Super admin", email: "admin@example.com", password: "Admin12345!" },
];

const PERSONAL_ACCOUNTS = [
  { label: "Student", email: "shivajitiwariint@gmail.com", password: "Student12345!" },
  { label: "Super admin", email: "shivajitiwari@gmail.com", password: "Admin12345!" },
];

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  function fillDemo(account: (typeof DEMO_ACCOUNTS)[number]) {
    setEmail(account.email);
    setPassword(account.password);
    setError(null);
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setSubmitting(true);

    try {
      const result = await signIn("credentials", {
        email: email.trim().toLowerCase(),
        password,
        redirect: false,
      });

      if (!result || result.error) {
        setError("Invalid email or password.");
        return;
      }

      const me = await apiFetch<{ user: SessionUser }>("/api/me");
      router.replace(me.user.role === "STUDENT" ? "/dashboard" : "/admin");
      router.refresh();
    } catch (signInError) {
      setError(getErrorMessage(signInError));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div>
      <div className="lg:hidden">
        <Link href="/" className="flex items-center gap-2.5">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-indigo-500 to-violet-600 text-sm font-bold text-white">
            E
          </span>
          <span className="text-sm font-semibold tracking-tight text-slate-900">ExamForge</span>
        </Link>
      </div>

      <h1 className="mt-8 text-2xl font-semibold tracking-tight text-slate-900 lg:mt-0">
        Welcome back
      </h1>
      <p className="mt-1 text-sm text-slate-500">
        Sign in with your email and password to continue.
      </p>

      <form onSubmit={handleSubmit} className="mt-6 space-y-4">
        {error ? <Alert tone="error">{error}</Alert> : null}

        <Field label="Email" htmlFor="email">
          <Input
            id="email"
            name="email"
            type="email"
            autoComplete="email"
            required
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            placeholder="you@example.com"
          />
        </Field>

        <Field label="Password" htmlFor="password">
          <Input
            id="password"
            name="password"
            type="password"
            autoComplete="current-password"
            required
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            placeholder="Your password"
          />
        </Field>

        <Button type="submit" loading={submitting} className="w-full">
          Sign in
        </Button>
      </form>

      <p className="mt-6 text-sm text-slate-600">
        New here?{" "}
        <Link href="/register" className="font-medium text-indigo-600 hover:text-indigo-500">
          Create a student account
        </Link>
      </p>

      {process.env.NODE_ENV !== "production" ? (
        <div className="mt-8 space-y-4">
          <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-xs text-slate-600">
            <p className="font-medium text-slate-700">Personal login details</p>
            <p className="mt-1 text-[11px] text-slate-500">Tap a row to fill the form.</p>
            <ul className="mt-2 space-y-1.5">
              {PERSONAL_ACCOUNTS.map((account) => (
                <li key={account.email}>
                  <button
                    type="button"
                    onClick={() => fillDemo(account)}
                    className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-left font-mono text-[11px] text-slate-700 transition hover:border-indigo-300 hover:bg-indigo-50"
                  >
                    <span className="font-semibold text-indigo-700">{account.label}</span>
                    <br />
                    {account.email} · {account.password}
                  </button>
                </li>
              ))}
            </ul>
          </div>

          <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-xs text-slate-600">
            <p className="font-medium text-slate-700">Demo login details</p>
            <p className="mt-1 text-[11px] text-slate-500">Tap a row to fill the form.</p>
            <ul className="mt-2 space-y-1.5">
              {DEMO_ACCOUNTS.map((account) => (
                <li key={account.email}>
                  <button
                    type="button"
                    onClick={() => fillDemo(account)}
                    className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-left font-mono text-[11px] text-slate-700 transition hover:border-indigo-300 hover:bg-indigo-50"
                  >
                    <span className="font-semibold text-indigo-700">{account.label}</span>
                    <br />
                    {account.email} · {account.password}
                  </button>
                </li>
              ))}
            </ul>
          </div>
        </div>
      ) : null}
    </div>
  );
}