"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";
import type { ReactNode } from "react";
import type { Role, SessionUser } from "@/types/api";
import { cn } from "./ui";

type NavItem = { href: string; label: string };

function navForRole(role: Role): { label: string; items: NavItem[] }[] {
  if (role === "STUDENT") {
    return [
      {
        label: "Study",
        items: [
          { href: "/dashboard", label: "Dashboard" },
          { href: "/exams", label: "Exams" },
          { href: "/question-bank", label: "Question bank" },
          { href: "/history", label: "History" },
          { href: "/interviews", label: "Interview prep" },
          { href: "/study", label: "Study assistant" },
        ],
      },
    ];
  }

  const items: NavItem[] = [
    { href: "/admin", label: "Admin home" },
    { href: "/admin/subjects", label: "Subjects" },
    { href: "/admin/interviews", label: "Interview bank" },
  ];
  if (role === "SUPER_ADMIN") {
    items.push({ href: "/admin/progress", label: "Student progress" });
    items.push({ href: "/admin/users", label: "Users" });
  }

  return [{ label: "Administration", items }];
}

function Brand({ compact = false }: { compact?: boolean }) {
  return (
    <Link href="/" className="flex items-center gap-2.5">
      <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-indigo-500 to-violet-600 text-sm font-bold text-white shadow-sm">
        E
      </span>
      {!compact ? (
        <span className="text-sm font-semibold tracking-tight text-slate-900">ExamForge</span>
      ) : null}
    </Link>
  );
}

function isActive(pathname: string, href: string): boolean {
  if (href === "/admin") return pathname === href;
  return pathname === href || pathname.startsWith(`${href}/`);
}

function NavLinks({
  items,
  pathname,
  onNavigate,
}: {
  items: NavItem[];
  pathname: string;
  onNavigate?: () => void;
}) {
  return (
    <div className="space-y-1">
      {items.map((item) => {
        const active = isActive(pathname, item.href);
        return (
          <Link
            key={item.href}
            href={item.href}
            onClick={onNavigate}
            className={cn(
              "flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
              active
                ? "bg-indigo-50 text-indigo-700"
                : "text-slate-600 hover:bg-slate-100 hover:text-slate-900",
            )}
          >
            <span
              className={cn(
                "h-1.5 w-1.5 rounded-full",
                active ? "bg-indigo-500" : "bg-slate-300",
              )}
              aria-hidden="true"
            />
            {item.label}
          </Link>
        );
      })}
    </div>
  );
}

export function AppShell({ user, children }: { user: SessionUser; children: ReactNode }) {
  const pathname = usePathname();
  const groups = navForRole(user.role);
  const roleLabel =
    user.role === "SUPER_ADMIN"
      ? "Super admin"
      : user.role === "SUBJECT_ADMIN"
        ? "Subject admin"
        : "Student";

  return (
    <div className="min-h-screen lg:flex">
      <aside className="sticky top-0 hidden h-screen w-64 shrink-0 flex-col border-r border-slate-200 bg-white lg:flex">
        <div className="flex h-16 items-center border-b border-slate-100 px-5">
          <Brand />
        </div>
        <div className="flex-1 space-y-6 overflow-y-auto px-3 py-5">
          {groups.map((group) => (
            <div key={group.label}>
              <p className="px-3 pb-2 text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                {group.label}
              </p>
              <NavLinks items={group.items} pathname={pathname} />
            </div>
          ))}
        </div>
        <div className="border-t border-slate-100 p-3">
          <div className="rounded-xl bg-slate-50 p-3">
            <p className="truncate text-sm font-medium text-slate-900">{user.name ?? "Account"}</p>
            <p className="truncate text-xs text-slate-500">{user.email}</p>
            <p className="mt-1 text-[11px] font-medium uppercase tracking-wide text-indigo-600">
              {roleLabel}
            </p>
            <button
              type="button"
              onClick={() => void signOut({ callbackUrl: "/" })}
              className="mt-2 text-xs font-medium text-slate-600 underline-offset-2 hover:text-slate-900 hover:underline"
            >
              Sign out
            </button>
          </div>
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-20 flex h-16 items-center justify-between border-b border-slate-200 bg-white/90 px-4 backdrop-blur lg:hidden">
          <Brand />
          <button
            type="button"
            onClick={() => void signOut({ callbackUrl: "/" })}
            className="rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-medium text-slate-700"
          >
            Sign out
          </button>
        </header>

        <div className="flex gap-1 overflow-x-auto border-b border-slate-200 bg-white px-3 py-2 lg:hidden">
          {groups.flatMap((group) => group.items).map((item) => {
            const active = isActive(pathname, item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "whitespace-nowrap rounded-lg px-3 py-1.5 text-sm font-medium",
                  active
                    ? "bg-indigo-50 text-indigo-700"
                    : "text-slate-600 hover:bg-slate-100",
                )}
              >
                {item.label}
              </Link>
            );
          })}
        </div>

        <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-6 sm:px-6 sm:py-8 lg:px-10">
          {children}
        </main>
      </div>
    </div>
  );
}
