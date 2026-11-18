"use client";

import Link from "next/link";
import { useApiData } from "@/lib/use-api";
import { formatDateTime, percent } from "@/lib/format";
import type { AdminDashboard } from "@/types/api";
import {
  Alert,
  Card,
  CardHeader,
  EmptyState,
  PageHeader,
  Spinner,
  StatCard,
  StatusBadge,
} from "@/components/ui";

export default function AdminDashboardPage() {
  const { data, error, loading, reload } = useApiData<AdminDashboard>("/api/admin/dashboard");

  if (loading && !data) {
    return (
      <Card className="flex items-center justify-center gap-2 py-16 text-sm text-slate-500">
        <Spinner /> Loading admin dashboard…
      </Card>
    );
  }

  if (error || !data) {
    return (
      <Alert tone="error">
        {error ?? "Could not load the dashboard."}{" "}
        <button className="underline" onClick={() => void reload()}>
          Retry
        </button>
      </Alert>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Admin dashboard"
        description={
          data.scope === "platform"
            ? "Platform-wide activity across every subject."
            : "Activity for the subjects you manage."
        }
        action={
          <div className="flex flex-wrap gap-2">
            {data.scope === "platform" ? (
              <Link
                href="/admin/progress"
                className="inline-flex h-10 items-center rounded-lg bg-indigo-600 px-4 text-sm font-medium text-white shadow-sm hover:bg-indigo-500"
              >
                Student progress
              </Link>
            ) : null}
            <Link
              href="/admin/subjects"
              className="inline-flex h-10 items-center rounded-lg border border-slate-300 bg-white px-4 text-sm font-medium text-slate-700 shadow-sm hover:bg-slate-50"
            >
              Upload & create questions
            </Link>
            <Link
              href="/admin/interviews"
              className="inline-flex h-10 items-center rounded-lg border border-slate-300 bg-white px-4 text-sm font-medium text-slate-700 shadow-sm hover:bg-slate-50"
            >
              Interview question bank
            </Link>
          </div>
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Subjects"
          value={data.subjects}
          hint={`${data.documents.processed} of ${data.documents.total} documents processed`}
        />
        <StatCard
          label="Pending review"
          value={data.questions.pendingReview}
          hint={`${data.questions.approved} approved · ${data.questions.total} total`}
          accent="amber"
        />
        <StatCard
          label="Published exams"
          value={data.exams.published}
          hint={`${data.exams.draft} drafts · ${data.exams.unpublished} unpublished`}
        />
        <StatCard
          label="Attempts"
          value={data.participation.attempts}
          hint={`Average score ${percent(data.participation.averagePercentage)}`}
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader
            title="Questions awaiting review"
            description="Approve or reject from the subject workspace."
          />
          {data.pendingQuestions.length === 0 ? (
            <EmptyState title="Nothing to review" description="The review queue is clear." />
          ) : (
            <ul className="divide-y divide-slate-100">
              {data.pendingQuestions.map((question) => (
                <li key={question.id} className="flex items-start justify-between gap-3 px-5 py-3">
                  <div className="min-w-0">
                    <p className="line-clamp-2 text-sm text-slate-800">{question.questionText}</p>
                    <p className="mt-0.5 text-xs text-slate-500">
                      {question.subject.name} · {question.source} ·{" "}
                      {formatDateTime(question.createdAt)}
                    </p>
                  </div>
                  <Link
                    href={`/admin/subjects/${question.subject.id}?tab=questions`}
                    className="shrink-0 text-xs font-medium text-indigo-600 hover:text-indigo-500"
                  >
                    Review
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </Card>

        <Card>
          <CardHeader
            title="Failed documents"
            description="Processing errors that may need attention."
          />
          {data.failedDocuments.length === 0 ? (
            <EmptyState title="No failures" description="All uploads processed cleanly." />
          ) : (
            <ul className="divide-y divide-slate-100">
              {data.failedDocuments.map((document) => (
                <li key={document.id} className="px-5 py-3">
                  <p className="truncate text-sm font-medium text-slate-800">
                    {document.originalFilename}
                  </p>
                  <p className="text-xs text-slate-500">{document.subject.name}</p>
                  <p className="mt-1 line-clamp-2 text-xs text-rose-600">
                    {document.errorMessage ?? "Unknown processing error."}
                  </p>
                  <Link
                    href={`/admin/subjects/${document.subject.id}?tab=documents`}
                    className="mt-1 inline-block text-xs font-medium text-indigo-600 hover:text-indigo-500"
                  >
                    Open documents
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>

      <Card>
        <CardHeader title="Recent exams" description="Newest exams across your scope." />
        {data.recentExams.length === 0 ? (
          <EmptyState
            title="No exams yet"
            description="Create a subject and add an exam to get started."
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-100 text-sm">
              <thead className="bg-slate-50/60 text-left text-xs uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="px-5 py-3 font-medium">Exam</th>
                  <th className="px-5 py-3 font-medium">Status</th>
                  <th className="px-5 py-3 font-medium">Questions</th>
                  <th className="px-5 py-3 font-medium">Attempts</th>
                  <th className="px-5 py-3 font-medium">Window</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {data.recentExams.map((exam) => (
                  <tr key={exam.id} className="hover:bg-slate-50/60">
                    <td className="px-5 py-3">
                      <Link
                        href={`/admin/subjects/${exam.subject.id}?tab=exams`}
                        className="font-medium text-slate-900 hover:text-indigo-600"
                      >
                        {exam.title}
                      </Link>
                      <p className="text-xs text-slate-500">{exam.subject.name}</p>
                    </td>
                    <td className="px-5 py-3">
                      <StatusBadge status={exam.status} />
                    </td>
                    <td className="px-5 py-3 text-slate-600">{exam.questionCount}</td>
                    <td className="px-5 py-3 text-slate-600">{exam.attemptCount}</td>
                    <td className="whitespace-nowrap px-5 py-3 text-xs text-slate-500">
                      {formatDateTime(exam.availabilityStart)} →{" "}
                      {formatDateTime(exam.availabilityEnd)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {data.users ? (
        <div className="grid gap-4 sm:grid-cols-3">
          <StatCard label="Users" value={data.users.total} hint={`${data.users.active} active`} />
          <StatCard label="Students" value={data.users.students} />
          <StatCard label="Subject admins" value={data.users.subjectAdmins} />
        </div>
      ) : null}
    </div>
  );
}
