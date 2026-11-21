"use client";

import Link from "next/link";
import { useState } from "react";
import { useApiData } from "@/lib/use-api";
import { formatDateTime, percent } from "@/lib/format";
import type { AdminStudentProgress, Paginated } from "@/types/api";
import {
  Alert,
  Badge,
  Button,
  Card,
  CardHeader,
  EmptyState,
  Field,
  Input,
  PageHeader,
  Spinner,
  StatusBadge,
} from "@/components/ui";

export default function AdminProgressPage() {
  const [searchDraft, setSearchDraft] = useState("");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);

  const query = new URLSearchParams({ page: String(page), pageSize: "10" });
  if (search) query.set("search", search);

  const { data, error, loading, reload } = useApiData<Paginated<AdminStudentProgress>>(
    `/api/admin/progress?${query.toString()}`,
  );

  const students = data?.items ?? [];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Student progress"
        description="Subject-wise exam performance and interview practice status for every student."
        action={
          <Link
            href="/admin/interviews"
            className="inline-flex h-10 items-center rounded-lg border border-slate-300 bg-white px-4 text-sm font-medium text-slate-700 shadow-sm hover:bg-slate-50"
          >
            Interview question bank
          </Link>
        }
      />

      <Card>
        <CardHeader
          title="Find a student"
          description="Search by name or email. Open a card to see subject-wise results and interview kits."
        />
        <form
          className="flex flex-col gap-3 p-5 sm:flex-row sm:items-end"
          onSubmit={(event) => {
            event.preventDefault();
            setSearch(searchDraft.trim());
            setPage(1);
          }}
        >
          <div className="flex-1">
            <Field label="Student name or email">
              <Input
                value={searchDraft}
                onChange={(event) => setSearchDraft(event.target.value)}
                placeholder="e.g. student@example.com"
              />
            </Field>
          </div>
          <div className="flex gap-2">
            <Button type="submit">Search</Button>
            {search ? (
              <Button
                type="button"
                variant="secondary"
                onClick={() => {
                  setSearchDraft("");
                  setSearch("");
                  setPage(1);
                }}
              >
                Clear
              </Button>
            ) : null}
          </div>
        </form>
      </Card>

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
          <Spinner /> Loading student progress…
        </Card>
      ) : null}

      {data && students.length === 0 ? (
        <Card>
          <EmptyState
            title="No students found"
            description={
              search
                ? "No student matches this search."
                : "Registered students will appear here with their exam and interview progress."
            }
          />
        </Card>
      ) : null}

      <div className="grid gap-4">
        {students.map((student) => (
          <Card key={student.id} className="p-5">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div className="min-w-0 space-y-1">
                <div className="flex flex-wrap items-center gap-2">
                  <h2 className="text-base font-semibold text-slate-900">{student.name}</h2>
                  <StatusBadge status={student.status} />
                </div>
                <p className="text-xs text-slate-500">{student.email}</p>
                <p className="text-xs text-slate-500">
                  Joined {formatDateTime(student.createdAt)} · Last login{" "}
                  {student.lastLoginAt ? formatDateTime(student.lastLoginAt) : "Never"}
                </p>
              </div>
              <Badge tone="slate">
                {student.exams.completedAttempts} completed exam
                {student.exams.completedAttempts === 1 ? "" : "s"}
              </Badge>
            </div>

            <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
              <div className="rounded-lg border border-slate-200 bg-slate-50/60 p-3">
                <p className="text-[11px] font-medium uppercase tracking-wide text-slate-500">
                  Exams
                </p>
                <p className="mt-1 text-lg font-semibold text-slate-900">
                  {student.exams.totalAttempts}
                </p>
                <p className="text-xs text-slate-500">
                  {student.exams.inProgressAttempts} in progress ·{" "}
                  {student.exams.completedAttempts} completed
                </p>
              </div>
              <div className="rounded-lg border border-slate-200 bg-slate-50/60 p-3">
                <p className="text-[11px] font-medium uppercase tracking-wide text-slate-500">
                  Average exam score
                </p>
                <p className="mt-1 text-lg font-semibold text-slate-900">
                  {percent(student.exams.averagePercentage)}
                </p>
                <p className="text-xs text-slate-500">
                  {student.exams.subjects.length} subject
                  {student.exams.subjects.length === 1 ? "" : "s"} attempted
                </p>
              </div>
              <div className="rounded-lg border border-slate-200 bg-slate-50/60 p-3">
                <p className="text-[11px] font-medium uppercase tracking-wide text-slate-500">
                  Interview practice
                </p>
                <p className="mt-1 text-lg font-semibold text-slate-900">
                  {student.interviews.completedSessions}
                </p>
                <p className="text-xs text-slate-500">
                  {student.interviews.kits} kit{student.interviews.kits === 1 ? "" : "s"} ·{" "}
                  {student.interviews.questions} questions
                </p>
              </div>
              <div className="rounded-lg border border-slate-200 bg-slate-50/60 p-3">
                <p className="text-[11px] font-medium uppercase tracking-wide text-slate-500">
                  Average interview score
                </p>
                <p className="mt-1 text-lg font-semibold text-slate-900">
                  {student.interviews.averageScore === null
                    ? "—"
                    : `${Math.round(student.interviews.averageScore)}/100`}
                </p>
                <p className="text-xs text-slate-500">
                  Last activity{" "}
                  {student.interviews.lastActivityAt
                    ? formatDateTime(student.interviews.lastActivityAt)
                    : "—"}
                </p>
              </div>
            </div>

            <details className="mt-4 rounded-lg border border-slate-200">
              <summary className="cursor-pointer px-3 py-2 text-sm font-medium text-slate-700">
                Subject-wise exam progress
              </summary>
              {student.exams.subjects.length === 0 ? (
                <p className="px-3 pb-3 text-xs text-slate-500">
                  No subject attempts yet.
                </p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-slate-100 text-sm">
                    <thead className="bg-slate-50/60 text-left text-xs uppercase tracking-wide text-slate-500">
                      <tr>
                        <th className="px-3 py-2 font-medium">Subject</th>
                        <th className="px-3 py-2 font-medium">Attempts</th>
                        <th className="px-3 py-2 font-medium">Average</th>
                        <th className="px-3 py-2 font-medium">Best</th>
                        <th className="px-3 py-2 font-medium">Last attempt</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {student.exams.subjects.map((subject) => (
                        <tr key={subject.id}>
                          <td className="px-3 py-2 font-medium text-slate-800">{subject.name}</td>
                          <td className="px-3 py-2 text-slate-600">{subject.attempts}</td>
                          <td className="px-3 py-2 text-slate-600">{percent(subject.average)}</td>
                          <td className="px-3 py-2 text-slate-600">{percent(subject.best)}</td>
                          <td className="whitespace-nowrap px-3 py-2 text-xs text-slate-500">
                            {subject.lastAttemptAt ? formatDateTime(subject.lastAttemptAt) : "—"}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </details>

            <details className="mt-3 rounded-lg border border-slate-200">
              <summary className="cursor-pointer px-3 py-2 text-sm font-medium text-slate-700">
                Interview preparation status
              </summary>
              {student.interviews.recentKits.length === 0 ? (
                <p className="px-3 pb-3 text-xs text-slate-500">
                  No interview kits created yet.
                </p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-slate-100 text-sm">
                    <thead className="bg-slate-50/60 text-left text-xs uppercase tracking-wide text-slate-500">
                      <tr>
                        <th className="px-3 py-2 font-medium">Company / kit</th>
                        <th className="px-3 py-2 font-medium">Status</th>
                        <th className="px-3 py-2 font-medium">Questions</th>
                        <th className="px-3 py-2 font-medium">Sessions</th>
                        <th className="px-3 py-2 font-medium">Latest score</th>
                        <th className="px-3 py-2 font-medium">Proctoring</th>
                        <th className="px-3 py-2 font-medium">Created</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {student.interviews.recentKits.map((kit) => (
                        <tr key={kit.id}>
                          <td className="px-3 py-2">
                            <p className="font-medium text-slate-800">
                              {kit.company || "No company"}
                            </p>
                            <p className="text-xs text-slate-500">
                              {kit.title}
                              {kit.role ? ` · ${kit.role}` : ""}
                            </p>
                          </td>
                          <td className="px-3 py-2">
                            <StatusBadge status={kit.status} />
                          </td>
                          <td className="px-3 py-2 text-slate-600">{kit.questionCount}</td>
                          <td className="px-3 py-2 text-slate-600">{kit.sessionCount}</td>
                          <td className="px-3 py-2 text-slate-600">
                            {kit.latestScore === null ? "—" : `${Math.round(kit.latestScore)}/100`}
                          </td>
                          <td className="px-3 py-2">
                            {kit.proctorFlagCount > 0 ? (
                              <Badge tone="red">{kit.proctorFlagCount} flags</Badge>
                            ) : kit.proctorEventCount > 0 ? (
                              <Badge tone="green">Clear</Badge>
                            ) : (
                              <span className="text-xs text-slate-400">No data</span>
                            )}
                          </td>
                          <td className="whitespace-nowrap px-3 py-2 text-xs text-slate-500">
                            {formatDateTime(kit.createdAt)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </details>
          </Card>
        ))}
      </div>

      {data && data.pagination.totalPages > 1 ? (
        <div className="flex flex-col gap-2 text-xs text-slate-500 sm:flex-row sm:items-center sm:justify-between">
          <span>
            Page {data.pagination.page} of {data.pagination.totalPages} ·{" "}
            {data.pagination.total} students
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
      ) : null}
    </div>
  );
}
