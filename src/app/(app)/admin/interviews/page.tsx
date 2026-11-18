"use client";

import { useEffect, useRef, useState } from "react";
import { apiFetch, getErrorMessage } from "@/lib/client-api";
import { useApiData } from "@/lib/use-api";
import { formatDate, formatDateTime, titleCase } from "@/lib/format";
import type { AdminInterviewKit, AdminProctorEvent, Paginated } from "@/types/api";
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
  Textarea,
} from "@/components/ui";

function categoryLabel(category: string): string {
  return category.toLowerCase().replace(/_/g, " ");
}

export default function AdminInterviewsPage() {
  const [searchDraft, setSearchDraft] = useState("");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);

  const query = new URLSearchParams({ page: String(page), pageSize: "20" });
  if (search) query.set("search", search);

  const { data, error, loading, reload } = useApiData<Paginated<AdminInterviewKit>>(
    `/api/admin/interviews?${query.toString()}`,
  );

  const kits = data?.items ?? [];
  const pageQuestions = kits.reduce((total, kit) => total + kit.questionCount, 0);
  const hasProcessing = kits.some((kit) => kit.status === "PROCESSING");

  const [showCreate, setShowCreate] = useState(false);
  const [company, setCompany] = useState("");
  const [role, setRole] = useState("");
  const [jdText, setJdText] = useState("");
  const [interviewDate, setInterviewDate] = useState("");
  const [actualQuestionsText, setActualQuestionsText] = useState("");
  const [jdName, setJdName] = useState("");
  const [actualName, setActualName] = useState("");
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [eventsFor, setEventsFor] = useState<string | null>(null);
  const [events, setEvents] = useState<AdminProctorEvent[]>([]);
  const [eventsLoading, setEventsLoading] = useState(false);
  const [eventsError, setEventsError] = useState<string | null>(null);
  const jdRef = useRef<HTMLInputElement | null>(null);
  const actualRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (!hasProcessing) return;
    const timer = window.setInterval(() => void reload(), 5000);
    return () => window.clearInterval(timer);
  }, [hasProcessing, reload]);

  async function createKit() {
    setCreateError(null);
    setNotice(null);

    if (!company.trim()) {
      setCreateError("Enter the company name.");
      return;
    }
    const jdFile = jdRef.current?.files?.[0];
    if (!jdFile && !jdText.trim()) {
      setCreateError("Upload or paste the job description.");
      return;
    }

    const form = new FormData();
    form.set("company", company.trim());
    if (role.trim()) form.set("role", role.trim());
    if (jdFile) form.set("jdFile", jdFile);
    if (jdText.trim()) form.set("jdText", jdText);
    if (interviewDate) form.set("interviewDate", interviewDate);
    if (actualQuestionsText.trim()) form.set("actualQuestionsText", actualQuestionsText);
    const actualFile = actualRef.current?.files?.[0];
    if (actualFile) form.set("actualQuestionsFile", actualFile);

    setCreating(true);
    try {
      await apiFetch("/api/admin/interviews", { method: "POST", body: form });
      setNotice(
        "Question bank generation started. It will appear below when ready; each mock interview asks 30 random questions.",
      );
      setCompany("");
      setRole("");
      setJdText("");
      setInterviewDate("");
      setActualQuestionsText("");
      setJdName("");
      setActualName("");
      if (jdRef.current) jdRef.current.value = "";
      if (actualRef.current) actualRef.current.value = "";
      setShowCreate(false);
      await reload();
    } catch (failure) {
      setCreateError(getErrorMessage(failure));
    } finally {
      setCreating(false);
    }
  }

  async function toggleProctoring(kitId: string) {
    if (eventsFor === kitId) {
      setEventsFor(null);
      return;
    }
    setEventsFor(kitId);
    setEvents([]);
    setEventsError(null);
    setEventsLoading(true);
    try {
      const result = await apiFetch<{ events: AdminProctorEvent[] }>(
        `/api/admin/interviews/${kitId}/proctor`,
      );
      setEvents(result.events);
    } catch (failure) {
      setEventsError(getErrorMessage(failure));
    } finally {
      setEventsLoading(false);
    }
  }

  async function deleteKit(kit: AdminInterviewKit) {
    if (
      !window.confirm(
        `Delete the "${kit.company ?? kit.title}" bank with ${kit.questionCount} questions and ${kit.sessionCount} sessions? This cannot be undone.`,
      )
    ) {
      return;
    }
    setBusyId(kit.id);
    setCreateError(null);
    setNotice(null);
    try {
      await apiFetch(`/api/admin/interviews/${kit.id}`, { method: "DELETE" });
      setNotice("Interview question bank deleted.");
      await reload();
    } catch (failure) {
      setCreateError(getErrorMessage(failure));
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Interview question bank"
        description="Every AI-generated interview question stored with its company and job description. Search by company, role, title, or JD content."
        action={
          <Button onClick={() => setShowCreate((value) => !value)}>
            {showCreate ? "Close" : "New question bank"}
          </Button>
        }
      />

      {notice ? <Alert tone="success">{notice}</Alert> : null}
      {createError ? <Alert tone="error">{createError}</Alert> : null}

      {showCreate ? (
        <Card>
          <CardHeader
            title="Create question bank"
            description="AI builds a comprehensive bank from the JD. Optionally add a previous interview date and the real questions asked so the AI can improve future banks."
          />
          <div className="space-y-4 p-5">
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Company" hint="Required. Used to group the bank.">
                <Input
                  value={company}
                  onChange={(event) => setCompany(event.target.value)}
                  placeholder="Acme Corp"
                />
              </Field>
              <Field label="Target role">
                <Input
                  value={role}
                  onChange={(event) => setRole(event.target.value)}
                  placeholder="Senior Backend Engineer"
                />
              </Field>
              <Field label="Previous interview date" hint="Optional.">
                <Input
                  type="date"
                  value={interviewDate}
                  onChange={(event) => setInterviewDate(event.target.value)}
                />
              </Field>
              <Field label="Job description file" hint="Optional if you paste the JD.">
                <input
                  ref={jdRef}
                  type="file"
                  accept=".pdf,.docx,.txt"
                  onChange={(event) => setJdName(event.target.files?.[0]?.name ?? "")}
                  className="block w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700 file:mr-3 file:rounded-md file:border-0 file:bg-slate-100 file:px-3 file:py-1.5 file:text-xs file:font-medium"
                />
                {jdName ? <p className="mt-1 text-xs text-slate-500">{jdName}</p> : null}
              </Field>
            </div>

            <Field label="Paste job description" hint="Required when no JD file is selected.">
              <Textarea
                value={jdText}
                onChange={(event) => setJdText(event.target.value)}
                rows={5}
                placeholder="Paste the responsibilities, requirements, and tech stack…"
              />
            </Field>

            <div className="grid gap-4 sm:grid-cols-2">
              <Field
                label="Actual questions file"
                hint="Optional. PDF, DOCX, or TXT from the main interview."
              >
                <input
                  ref={actualRef}
                  type="file"
                  accept=".pdf,.docx,.txt"
                  onChange={(event) => setActualName(event.target.files?.[0]?.name ?? "")}
                  className="block w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700 file:mr-3 file:rounded-md file:border-0 file:bg-slate-100 file:px-3 file:py-1.5 file:text-xs file:font-medium"
                />
                {actualName ? <p className="mt-1 text-xs text-slate-500">{actualName}</p> : null}
              </Field>
              <Field
                label="Actual questions asked"
                hint="Optional. Paste real questions so AI can improve generation."
              >
                <Textarea
                  value={actualQuestionsText}
                  onChange={(event) => setActualQuestionsText(event.target.value)}
                  rows={3}
                  placeholder="e.g. Design a rate limiter…"
                />
              </Field>
            </div>

            <div className="flex items-center justify-between gap-3">
              <p className="text-xs text-slate-500">
                AI builds the full bank; each mock interview randomly asks 30 questions.
              </p>
              <Button onClick={() => void createKit()} loading={creating}>
                Generate question bank
              </Button>
            </div>
          </div>
        </Card>
      ) : null}

      <Card>
        <CardHeader
          title="Search"
          description="Results are grouped by interview kit, which holds the company, role, and job description that produced the questions."
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
            <Field label="Company, role, title, or JD text">
              <Input
                value={searchDraft}
                onChange={(event) => setSearchDraft(event.target.value)}
                placeholder="e.g. Acme, Backend Engineer, Kubernetes"
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
          <Spinner /> Loading interview questions…
        </Card>
      ) : null}

      {data ? (
        <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500">
          <span>
            {data.pagination.total} kit{data.pagination.total === 1 ? "" : "s"} · {pageQuestions}{" "}
            questions on this page
          </span>
        </div>
      ) : null}

      {data && kits.length === 0 ? (
        <Card>
          <EmptyState
            title="No interview questions found"
            description={
              search
                ? "No kit matches this search. Try a different company, role, or JD keyword."
                : "Interview kits and their AI-generated questions will appear here once students create them."
            }
          />
        </Card>
      ) : null}

      <div className="grid gap-4">
        {kits.map((kit) => (
          <Card key={kit.id} className="p-5">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div className="min-w-0 space-y-2">
                <div className="flex flex-wrap items-center gap-2">
                  <h2 className="text-base font-semibold text-slate-900">
                    {kit.company || "No company"}
                  </h2>
                  <StatusBadge status={kit.status} />
                  <Badge tone="violet">{kit.questionCount} questions</Badge>
                  {kit.sessionCount > 0 ? (
                    <Badge tone="slate">
                      {kit.sessionCount} session{kit.sessionCount === 1 ? "" : "s"}
                    </Badge>
                  ) : null}
                  {kit.proctorFlagCount > 0 ? (
                    <Badge tone="red">
                      {kit.proctorFlagCount} proctor flag
                      {kit.proctorFlagCount === 1 ? "" : "s"}
                    </Badge>
                  ) : kit.proctorEventCount > 0 ? (
                    <Badge tone="slate">
                      {kit.proctorEventCount} proctor event
                      {kit.proctorEventCount === 1 ? "" : "s"}
                    </Badge>
                  ) : null}
                </div>
                <p className="text-sm text-slate-700">
                  {kit.title}
                  {kit.role ? ` · ${kit.role}` : ""}
                </p>
                <p className="text-xs text-slate-500">
                  JD: {kit.jdFilename ?? "Pasted text"} · Owner: {kit.owner.name} (
                  {kit.owner.email}) · {formatDateTime(kit.createdAt)}
                </p>
                {kit.interviewDate ? (
                  <p className="text-xs text-slate-500">
                    Main interview: {formatDate(kit.interviewDate)}
                    {kit.actualQuestionsFilename
                      ? ` · Actual questions: ${kit.actualQuestionsFilename}`
                      : ""}
                  </p>
                ) : null}
              </div>
              <div className="flex shrink-0 flex-wrap items-center justify-end gap-2">
                <Badge tone="sky">30 asked per mock</Badge>
                {kit.proctorEventCount > 0 ? (
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => void toggleProctoring(kit.id)}
                  >
                    {eventsFor === kit.id ? "Hide proctoring" : "View proctoring"}
                  </Button>
                ) : null}
                <Button
                  size="sm"
                  variant="ghost"
                  className="text-rose-600 hover:bg-rose-50 hover:text-rose-700"
                  onClick={() => void deleteKit(kit)}
                  disabled={busyId === kit.id}
                >
                  Delete
                </Button>
              </div>
            </div>

            {kit.jdPreview ? (
              <details className="mt-3 rounded-lg border border-slate-200 bg-slate-50/60">
                <summary className="cursor-pointer px-3 py-2 text-xs font-medium text-slate-600">
                  View job description preview
                </summary>
                <pre className="max-h-64 overflow-auto whitespace-pre-wrap px-3 pb-3 text-xs text-slate-600">
                  {kit.jdPreview}
                </pre>
              </details>
            ) : null}

            {kit.actualQuestionsPreview ? (
              <details className="mt-3 rounded-lg border border-emerald-200 bg-emerald-50/50">
                <summary className="cursor-pointer px-3 py-2 text-xs font-medium text-emerald-800">
                  Actual questions from the main interview
                </summary>
                <pre className="max-h-64 overflow-auto whitespace-pre-wrap px-3 pb-3 text-xs text-emerald-900">
                  {kit.actualQuestionsPreview}
                </pre>
              </details>
            ) : null}

            {eventsFor === kit.id ? (
              <div className="mt-3 rounded-lg border border-slate-200 bg-slate-50/60">
                <div className="flex items-center justify-between gap-2 border-b border-slate-200 px-3 py-2">
                  <p className="text-xs font-semibold text-slate-700">Proctoring events</p>
                  <span className="text-[11px] text-slate-500">
                    {kit.proctorFlagCount} flagged of {kit.proctorEventCount}
                  </span>
                </div>
                {eventsLoading ? (
                  <p className="flex items-center gap-2 px-3 py-3 text-xs text-slate-500">
                    <Spinner /> Loading events…
                  </p>
                ) : eventsError ? (
                  <p className="px-3 py-3 text-xs text-rose-600">{eventsError}</p>
                ) : events.length === 0 ? (
                  <p className="px-3 py-3 text-xs text-slate-500">
                    No proctoring events recorded for this kit yet.
                  </p>
                ) : (
                  <ul className="max-h-72 divide-y divide-slate-200 overflow-auto">
                    {events.map((event) => (
                      <li
                        key={event.id}
                        className="flex flex-wrap items-center gap-2 px-3 py-2 text-xs"
                      >
                        <Badge tone={event.flagged ? "red" : "slate"}>
                          {titleCase(event.type.replace(/_/g, " "))}
                        </Badge>
                        <span className="text-slate-600">{formatDateTime(event.occurredAt)}</span>
                        <span className="text-slate-400">
                          session started {formatDateTime(event.session.startedAt)}
                        </span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            ) : null}

            {kit.questions.length === 0 ? (
              <p className="mt-3 text-xs text-slate-500">No questions stored for this kit yet.</p>
            ) : (
              <ol className="mt-4 divide-y divide-slate-100 border-t border-slate-100">
                {kit.questions.map((question) => (
                  <li key={question.id} className="py-3">
                    <div className="flex items-start gap-3">
                      <span className="mt-0.5 min-w-6 text-xs font-semibold text-slate-400">
                        {question.order}.
                      </span>
                      <div className="min-w-0 flex-1 space-y-1.5">
                        <p className="text-sm text-slate-800">{question.questionText}</p>
                        <div className="flex flex-wrap items-center gap-1.5">
                          <Badge tone="sky">{categoryLabel(question.category)}</Badge>
                          <Badge tone="slate">{question.difficulty.toLowerCase()}</Badge>
                        </div>
                        {question.expectedAnswer ? (
                          <details className="text-xs text-slate-500">
                            <summary className="cursor-pointer font-medium text-indigo-600">
                              Expected answer
                            </summary>
                            <p className="mt-1 whitespace-pre-wrap text-slate-600">
                              {question.expectedAnswer}
                            </p>
                          </details>
                        ) : null}
                      </div>
                    </div>
                  </li>
                ))}
              </ol>
            )}
          </Card>
        ))}
      </div>

      {data && data.pagination.totalPages > 1 ? (
        <div className="flex flex-col gap-2 text-xs text-slate-500 sm:flex-row sm:items-center sm:justify-between">
          <span>
            Page {data.pagination.page} of {data.pagination.totalPages}
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
