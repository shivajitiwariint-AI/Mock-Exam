"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useApiData } from "@/lib/use-api";
import { formatDate, formatDateTime, percent } from "@/lib/format";
import type { StudentExam } from "@/types/api";
import {
  Alert,
  Badge,
  Card,
  EmptyState,
  PageHeader,
  Spinner,
  StatusBadge,
  cn,
} from "@/components/ui";

const FILTERS = ["ALL", "OPEN", "UPCOMING", "CLOSED"] as const;
type Filter = (typeof FILTERS)[number];

export default function ExamsPage() {
  const { data, error, loading, reload } = useApiData<StudentExam[]>("/api/exams");
  const [filter, setFilter] = useState<Filter>("ALL");

  const exams = useMemo(() => {
    if (!data) return [];
    return filter === "ALL" ? data : data.filter((exam) => exam.availability === filter);
  }, [data, filter]);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Exams"
        description="Published exams you can take. Availability and attempt limits are enforced by the server."
      />

      <div className="flex flex-wrap gap-1.5">
        {FILTERS.map((option) => (
          <button
            key={option}
            type="button"
            onClick={() => setFilter(option)}
            className={cn(
              "rounded-lg px-3 py-1.5 text-xs font-medium transition-colors",
              filter === option
                ? "bg-slate-900 text-white"
                : "border border-slate-200 bg-white text-slate-600 hover:bg-slate-50",
            )}
          >
            {option === "ALL" ? "All exams" : option.charAt(0) + option.slice(1).toLowerCase()}
            {data ? (
              <span className="ml-1.5 text-[10px] opacity-70">
                {option === "ALL"
                  ? data.length
                  : data.filter((exam) => exam.availability === option).length}
              </span>
            ) : null}
          </button>
        ))}
      </div>

      {error ? (
        <Alert tone="error">
          {error}{" "}
          <button className="underline" onClick={() => void reload()}>
            Retry
          </button>
        </Alert>
      ) : null}

      {loading && !data ? (
        <Card className="flex items-center justify-center gap-2 py-16 text-sm text-slate-500">
          <Spinner /> Loading exams…
        </Card>
      ) : null}

      {data && exams.length === 0 ? (
        <Card>
          <EmptyState
            title={filter === "ALL" ? "No exams are published yet" : `No ${filter.toLowerCase()} exams`}
            description={
              filter === "ALL"
                ? "Check back once an administrator publishes an exam for one of your subjects."
                : "Try a different filter to see other exams."
            }
          />
        </Card>
      ) : null}

      <div className="grid gap-4 md:grid-cols-2">
        {exams.map((exam) => {
          const inProgress = exam.attempts.find((attempt) => attempt.status === "IN_PROGRESS");
          const lastAttempt = exam.attempts[0];
          const exhausted = exam.attemptsRemaining === 0 && !inProgress;

          return (
            <Card key={exam.id} className="flex h-full flex-col p-5">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge tone="violet">{exam.subject.name}</Badge>
                    <StatusBadge status={exam.availability} />
                  </div>
                  <h2 className="mt-2 text-base font-semibold text-slate-900">{exam.title}</h2>
                  <p className="mt-1 line-clamp-2 text-sm text-slate-500">
                    {exam.description ?? "No description provided."}
                  </p>
                </div>
              </div>

              <dl className="mt-4 grid grid-cols-2 gap-3 text-xs sm:grid-cols-4">
                <div>
                  <dt className="text-slate-400">Duration</dt>
                  <dd className="mt-0.5 font-medium text-slate-700">
                    {exam.durationMinutes} min
                  </dd>
                </div>
                <div>
                  <dt className="text-slate-400">Questions</dt>
                  <dd className="mt-0.5 font-medium text-slate-700">{exam.questionCount}</dd>
                </div>
                <div>
                  <dt className="text-slate-400">Pass mark</dt>
                  <dd className="mt-0.5 font-medium text-slate-700">{exam.passPercentage}%</dd>
                </div>
                <div>
                  <dt className="text-slate-400">Attempts left</dt>
                  <dd className="mt-0.5 font-medium text-slate-700">
                    {exam.attemptsRemaining}/{exam.maxAttempts}
                  </dd>
                </div>
              </dl>

              <div className="mt-4 rounded-lg bg-slate-50 px-3 py-2 text-xs text-slate-600">
                <p>
                  Opens {formatDateTime(exam.availabilityStart)} · Closes{" "}
                  {formatDateTime(exam.availabilityEnd)}
                </p>
                {lastAttempt?.percentage !== null && lastAttempt?.percentage !== undefined ? (
                  <p className="mt-1">
                    Last attempt {formatDate(lastAttempt.expiresAt)}:{" "}
                    <span
                      className={
                        lastAttempt.passed ? "font-medium text-emerald-600" : "font-medium text-rose-600"
                      }
                    >
                      {percent(lastAttempt.percentage)}
                    </span>
                  </p>
                ) : null}
              </div>

              <div className="mt-auto flex items-center justify-between gap-3 pt-4">
                <Link
                  href={`/exams/${exam.id}`}
                  className="text-sm font-medium text-slate-600 hover:text-slate-900"
                >
                  View details
                </Link>

                {inProgress ? (
                  <Link
                    href={`/attempts/${inProgress.id}`}
                    className="inline-flex h-9 items-center rounded-lg bg-indigo-600 px-4 text-sm font-medium text-white shadow-sm hover:bg-indigo-500"
                  >
                    Resume attempt
                  </Link>
                ) : exam.availability === "OPEN" && !exhausted ? (
                  <Link
                    href={`/exams/${exam.id}`}
                    className="inline-flex h-9 items-center rounded-lg bg-indigo-600 px-4 text-sm font-medium text-white shadow-sm hover:bg-indigo-500"
                  >
                    {exam.attemptsUsed > 0 ? "Retake exam" : "Start exam"}
                  </Link>
                ) : (
                  <span className="text-xs text-slate-400">
                    {exhausted
                      ? "No attempts left"
                      : exam.availability === "UPCOMING"
                        ? "Not open yet"
                        : "Closed"}
                  </span>
                )}
              </div>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
