"use client";

import Link from "next/link";
import { useState } from "react";
import { apiFetch, getErrorMessage } from "@/lib/client-api";
import { useApiData } from "@/lib/use-api";
import { useCurrentUser } from "@/lib/use-current-user";
import type { AdminSubject, Paginated } from "@/types/api";
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

export default function AdminSubjectsPage() {
  const { isSuperAdmin } = useCurrentUser();

  const [search, setSearch] = useState("");
  const [appliedSearch, setAppliedSearch] = useState("");
  const [status, setStatus] = useState("");
  const [page, setPage] = useState(1);

  const query = new URLSearchParams({ page: String(page), pageSize: "20" });
  if (appliedSearch) query.set("search", appliedSearch);
  if (status) query.set("status", status);

  const { data, error, loading, reload } = useApiData<Paginated<AdminSubject>>(
    `/api/admin/subjects?${query.toString()}`,
  );

  const [showCreate, setShowCreate] = useState(false);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [topics, setTopics] = useState("");
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<number | null>(null);
  const [selectedSubjects, setSelectedSubjects] = useState<Record<number, boolean>>({});
  const [bulkBusy, setBulkBusy] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  async function deleteSubject(subject: AdminSubject) {
    if (
      !window.confirm(
        `Delete "${subject.name}"? This permanently removes its topics, documents, questions, exams, attempts, and interview links.`,
      )
    ) {
      return;
    }
    setBusyId(subject.id);
    setDeleteError(null);
    setNotice(null);
    try {
      await apiFetch(`/api/admin/subjects/${subject.id}`, { method: "DELETE" });
      setNotice(`Deleted ${subject.name}.`);
      await reload();
    } catch (failure) {
      setDeleteError(getErrorMessage(failure));
    } finally {
      setBusyId(null);
    }
  }

  const selectedSubjectsList = (data?.items ?? []).filter((subject) => selectedSubjects[subject.id]);

  async function bulkDeleteSubjects() {
    const targets = selectedSubjectsList;
    if (targets.length === 0) return;
    if (
      !window.confirm(
        `Delete ${targets.length} subject(s)? This permanently removes their topics, documents, questions, exams, attempts, and interview links.`,
      )
    ) {
      return;
    }
    setBulkBusy(true);
    setDeleteError(null);
    setNotice(null);
    for (const subject of targets) {
      try {
        await apiFetch(`/api/admin/subjects/${subject.id}`, { method: "DELETE" });
      } catch (failure) {
        setDeleteError(getErrorMessage(failure));
        break;
      }
    }
    setSelectedSubjects({});
    setBulkBusy(false);
    setNotice(`Deleted ${targets.length} subject(s).`);
    await reload();
  }

  async function createSubject(event: React.FormEvent) {
    event.preventDefault();
    setCreating(true);
    setCreateError(null);
    try {
      await apiFetch("/api/admin/subjects", {
        method: "POST",
        body: JSON.stringify({
          name,
          description: description.trim() || undefined,
          topics: topics
            .split(",")
            .map((topic) => topic.trim())
            .filter(Boolean),
        }),
      });
      setName("");
      setDescription("");
      setTopics("");
      setShowCreate(false);
      setPage(1);
      await reload();
    } catch (failure) {
      setCreateError(getErrorMessage(failure));
    } finally {
      setCreating(false);
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Subjects"
        description="Each subject holds its own study material, question bank, and exams."
        action={
          isSuperAdmin ? (
            <Button onClick={() => setShowCreate((value) => !value)}>
              {showCreate ? "Close" : "New subject"}
            </Button>
          ) : null
        }
      />

      {notice ? <Alert tone="success">{notice}</Alert> : null}
      {deleteError ? <Alert tone="error">{deleteError}</Alert> : null}

      {showCreate && isSuperAdmin ? (
        <Card>
          <CardHeader title="Create subject" description="Topics are optional and comma-separated." />
          <form onSubmit={createSubject} className="space-y-4 p-5">
            <Field label="Name" htmlFor="subject-name">
              <Input
                id="subject-name"
                value={name}
                onChange={(event) => setName(event.target.value)}
                required
                minLength={2}
                maxLength={120}
                placeholder="e.g. Applied Statistics"
              />
            </Field>
            <Field label="Description" htmlFor="subject-description" hint="Optional, up to 2000 characters.">
              <Textarea
                id="subject-description"
                value={description}
                onChange={(event) => setDescription(event.target.value)}
                rows={3}
                maxLength={2000}
              />
            </Field>
            <Field label="Topics" htmlFor="subject-topics" hint="Comma-separated, e.g. Probability, Regression">
              <Input
                id="subject-topics"
                value={topics}
                onChange={(event) => setTopics(event.target.value)}
                placeholder="Probability, Regression, Sampling"
              />
            </Field>
            {createError ? <Alert tone="error">{createError}</Alert> : null}
            <div className="flex justify-end gap-2">
              <Button type="button" variant="secondary" onClick={() => setShowCreate(false)}>
                Cancel
              </Button>
              <Button type="submit" loading={creating}>
                Create subject
              </Button>
            </div>
          </form>
        </Card>
      ) : null}

      <Card>
        <div className="flex flex-col gap-3 border-b border-slate-100 p-4 sm:flex-row sm:items-center">
          <form
            className="flex flex-1 gap-2"
            onSubmit={(event) => {
              event.preventDefault();
              setPage(1);
              setAppliedSearch(search.trim());
            }}
          >
            <Input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search subjects…"
              aria-label="Search subjects"
            />
            <Button type="submit" variant="secondary">
              Search
            </Button>
          </form>
          <select
            value={status}
            onChange={(event) => {
              setStatus(event.target.value);
              setPage(1);
            }}
            aria-label="Filter by status"
            className="h-10 rounded-lg border border-slate-300 bg-white px-3 text-sm shadow-sm outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100"
          >
            <option value="">All statuses</option>
            <option value="ACTIVE">Active</option>
            <option value="INACTIVE">Inactive</option>
          </select>
        </div>

        {isSuperAdmin ? (
          <div className="flex flex-col gap-2 border-b border-slate-100 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-xs text-slate-500">Tick subjects in the list to select them, then bulk delete.</p>
            <Button
              size="sm"
              variant="danger"
              onClick={() => void bulkDeleteSubjects()}
              loading={bulkBusy}
              disabled={selectedSubjectsList.length === 0}
            >
              Delete selected ({selectedSubjectsList.length})
            </Button>
          </div>
        ) : null}

        {error ? (
          <div className="p-4">
            <Alert tone="error">
              {error}{" "}
              <button className="underline" onClick={() => void reload()}>
                Retry
              </button>
            </Alert>
          </div>
        ) : null}

        {loading && !data ? (
          <div className="flex items-center justify-center gap-2 py-16 text-sm text-slate-500">
            <Spinner /> Loading subjects…
          </div>
        ) : null}

        {data && data.items.length === 0 ? (
          <EmptyState
            title="No subjects found"
            description={
              appliedSearch || status
                ? "Try adjusting your search or filters."
                : "Create your first subject to get started."
            }
          />
        ) : null}

        {data && data.items.length > 0 ? (
          <>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-slate-100 text-sm">
                <thead className="bg-slate-50/60 text-left text-xs uppercase tracking-wide text-slate-500">
                  <tr>
                    <th className="px-5 py-3 font-medium">
                      <input
                        type="checkbox"
                        checked={data.items.length > 0 && data.items.every((subject) => selectedSubjects[subject.id])}
                        onChange={(event) => {
                          const next = { ...selectedSubjects };
                          if (event.target.checked) {
                            data.items.forEach((subject) => { next[subject.id] = true });
                          } else {
                            data.items.forEach((subject) => { next[subject.id] = false });
                          }
                          setSelectedSubjects(next);
                        }}
                        className="h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                        aria-label="Select all subjects"
                      />
                    </th>
                    <th className="px-5 py-3 font-medium">Subject</th>
                    <th className="px-5 py-3 font-medium">Status</th>
                    <th className="px-5 py-3 font-medium">Content</th>
                    <th className="px-5 py-3 font-medium">Admins</th>
                    <th className="px-5 py-3 font-medium text-right">Open</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {data.items.map((subject) => (
                    <tr key={subject.id} className="hover:bg-slate-50/60">
                      <td className="px-5 py-3">
                        <input
                          type="checkbox"
                          checked={Boolean(selectedSubjects[subject.id])}
                          onChange={(event) => {
                            setSelectedSubjects((prev) => ({ ...prev, [subject.id]: event.target.checked }));
                          }}
                          className="h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                          aria-label={`Select subject ${subject.name}`}
                        />
                      </td>
                      <td className="px-5 py-3">
                        <Link
                          href={`/admin/subjects/${subject.id}`}
                          className="font-medium text-slate-900 hover:text-indigo-600"
                        >
                          {subject.name}
                        </Link>
                        <p className="text-xs text-slate-500">/{subject.slug}</p>
                        {subject.topics.length > 0 ? (
                          <p className="mt-1 line-clamp-1 text-xs text-slate-400">
                            {subject.topics.map((topic) => topic.name).join(" · ")}
                          </p>
                        ) : null}
                      </td>
                      <td className="px-5 py-3">
                        <StatusBadge status={subject.status} />
                      </td>
                      <td className="px-5 py-3 text-xs text-slate-600">
                        <div className="flex flex-wrap gap-1">
                          <Badge tone="slate">{subject.documentCount} docs</Badge>
                          <Badge tone="slate">{subject.questionCount} questions</Badge>
                          <Badge tone="slate">{subject.examCount} exams</Badge>
                        </div>
                      </td>
                      <td className="px-5 py-3 text-xs text-slate-600">
                        {subject.admins.length === 0
                          ? "—"
                          : subject.admins.map((admin) => admin.name).join(", ")}
                      </td>
                      <td className="px-5 py-3 text-right">
                        <div className="flex items-center justify-end gap-3">
                          <Link
                            href={`/admin/subjects/${subject.id}`}
                            className="text-xs font-medium text-indigo-600 hover:text-indigo-500"
                          >
                            Manage
                          </Link>
                          {isSuperAdmin ? (
                            <Button
                              size="sm"
                              variant="ghost"
                              className="text-rose-600 hover:bg-rose-50 hover:text-rose-700"
                              onClick={() => void deleteSubject(subject)}
                              disabled={busyId === subject.id}
                            >
                              Delete
                            </Button>
                          ) : null}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="flex flex-col gap-2 border-t border-slate-100 px-5 py-3 text-xs text-slate-500 sm:flex-row sm:items-center sm:justify-between">
              <span>
                Page {data.pagination.page} of {data.pagination.totalPages} ·{" "}
                {data.pagination.total} subjects
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
        ) : null}
      </Card>
    </div>
  );
}
