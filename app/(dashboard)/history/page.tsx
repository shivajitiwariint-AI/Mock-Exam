"use client";

import Link from "next/link";
import { useState } from "react";
import { useApiData } from "@/lib/use-api";
import { formatDateTime, formatDuration, percent } from "@/lib/format";
import type { AttemptSummary, Paginated } from "@/types/api";
import {
  Alert,
  Button,
  Card,
  EmptyState,
  PageHeader,
  Spinner,
  StatusBadge,
} from "@/components/ui";

type HistoryAttempt = AttemptSummary & {
  exam: { id: string; title: string; subject: { id: string; name: string } };
};

export default function HistoryPage() {
  const [page, setPage] = useState(1);
  const { data, error, loading, reload } = useApiData<Paginated<HistoryAttempt>>(
    `/api/dashboard/history?page=${page}&pageSize=15`,
  );

  return (
    <div className="space-y-6">
      <PageHeader
        title="Attempt history"
        description="Every attempt you have started, including in-progress and expired attempts."
      />

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
          <Spinner /> Loading history…
        </Card>
      ) : null}

      {data ? (
        <Card>
          {data.items.length === 0 ? (
            <EmptyState
              title="No attempts yet"
              description="Start your first exam and your results will appear here."
              action={
                <Link
                  href="/exams"
                  className="text-sm font-medium text-indigo-600 hover:text-indigo-500"
                >
                  Browse exams →
                </Link>
              }
            />
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-slate-100 text-sm">
                  <thead className="bg-slate-50/60 text-left text-xs uppercase tracking-wide text-slate-500">
                    <tr>
                      <th className="px-5 py-3 font-medium">Exam</th>
                      <th className="px-5 py-3 font-medium">Started</th>
                      <th className="px-5 py-3 font-medium">Status</th>
                      <th className="px-5 py-3 font-medium">Score</th>
                      <th className="px-5 py-3 font-medium">Time</th>
                      <th className="px-5 py-3 font-medium text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {data.items.map((attempt) => (
                      <tr key={attempt.id} className="hover:bg-slate-50/60">
                        <td className="px-5 py-3">
                          <p className="font-medium text-slate-900">{attempt.exam.title}</p>
                          <p className="text-xs text-slate-500">
                            {attempt.exam.subject.name} · attempt {attempt.attemptNumber}
                          </p>
                        </td>
                        <td className="whitespace-nowrap px-5 py-3 text-slate-600">
                          {formatDateTime(attempt.startedAt)}
                        </td>
                        <td className="px-5 py-3">
                          <StatusBadge status={attempt.status} />
                        </td>
                        <td className="px-5 py-3">
                          {attempt.percentage !== null ? (
                            <span
                              className={
                                attempt.passed
                                  ? "font-semibold text-emerald-600"
                                  : "font-semibold text-rose-600"
                              }
                            >
                              {percent(attempt.percentage)}
                            </span>
                          ) : (
                            <span className="text-slate-400">—</span>
                          )}
                        </td>
                        <td className="whitespace-nowrap px-5 py-3 text-slate-600">
                          {formatDuration(attempt.timeTakenSeconds)}
                        </td>
                        <td className="px-5 py-3 text-right">
                          <Link
                            href={`/attempts/${attempt.id}`}
                            className="text-xs font-medium text-indigo-600 hover:text-indigo-500"
                          >
                            {attempt.status === "IN_PROGRESS" ? "Resume" : "View result"}
                          </Link>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="flex flex-col gap-2 border-t border-slate-100 px-5 py-3 text-xs text-slate-500 sm:flex-row sm:items-center sm:justify-between">
                <span>
                  Page {data.pagination.page} of {data.pagination.totalPages} ·{" "}
                  {data.pagination.total} attempts
                </span>
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant="secondary"
                    disabled={page <= 1}
                    onClick={() => setPage((value) => Math.max(1, value - 1))}
                  >
                    Previous
                  </Button>
                  <Button
                    size="sm"
                    variant="secondary"
                    disabled={page >= data.pagination.totalPages}
                    onClick={() => setPage((value) => value + 1)}
                  >
                    Next
                  </Button>
                </div>
              </div>
            </>
          )}
        </Card>
      ) : null}
    </div>
  );
}
