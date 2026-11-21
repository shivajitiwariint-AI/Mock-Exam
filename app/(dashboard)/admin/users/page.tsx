"use client";

import { useState } from "react";
import { apiFetch, getErrorMessage } from "@/lib/client-api";
import { useApiData } from "@/lib/use-api";
import { useCurrentUser } from "@/lib/use-current-user";
import { formatDateTime } from "@/lib/format";
import type {
  AdminSubject,
  AdminUser,
  Paginated,
  Role,
  UserStatus,
} from "@/types/api";
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
  Select,
  Spinner,
  StatusBadge,
  cn,
} from "@/components/ui";

const ROLES: Role[] = ["SUPER_ADMIN", "SUBJECT_ADMIN", "STUDENT"];
const USER_STATUSES: UserStatus[] = ["ACTIVE", "SUSPENDED", "DISABLED"];

export default function AdminUsersPage() {
  const { user: currentUser } = useCurrentUser();
  const currentUserId = currentUser?.id;

  const [search, setSearch] = useState("");
  const [appliedSearch, setAppliedSearch] = useState("");
  const [role, setRole] = useState("");
  const [status, setStatus] = useState("");
  const [page, setPage] = useState(1);

  const query = new URLSearchParams({ page: String(page), pageSize: "20" });
  if (appliedSearch) query.set("search", appliedSearch);
  if (role) query.set("role", role);
  if (status) query.set("status", status);

  const { data, error, loading, reload } = useApiData<Paginated<AdminUser>>(
    `/api/admin/users?${query.toString()}`,
  );

  const [showCreate, setShowCreate] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [newRole, setNewRole] = useState<Role>("STUDENT");
  const [subjectIds, setSubjectIds] = useState<number[]>([]);
  const [creating, setCreating] = useState(false);
  const [busyId, setBusyId] = useState<number | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  const { data: subjectsData } = useApiData<Paginated<AdminSubject>>(
    "/api/admin/subjects?pageSize=100",
  );

  async function createUser(event: React.FormEvent) {
    event.preventDefault();
    setCreating(true);
    setActionError(null);
    setMessage(null);
    try {
      await apiFetch("/api/admin/users/create", {
        method: "POST",
        body: JSON.stringify({
          name: name.trim(),
          email: email.trim(),
          password,
          role: newRole,
          ...(newRole === "SUBJECT_ADMIN" && subjectIds.length ? { subjectIds } : {}),
        }),
      });
      setMessage(`Created ${email.trim()}.`);
      setName("");
      setEmail("");
      setPassword("");
      setNewRole("STUDENT");
      setSubjectIds([]);
      setShowCreate(false);
      setPage(1);
      await reload();
    } catch (failure) {
      setActionError(getErrorMessage(failure));
    } finally {
      setCreating(false);
    }
  }

  async function updateUser(
    user: AdminUser,
    patch: { role?: Role; status?: UserStatus },
  ) {
    setBusyId(user.id);
    setActionError(null);
    setMessage(null);
    try {
      await apiFetch(`/api/admin/users/${user.id}`, {
        method: "PATCH",
        body: JSON.stringify(patch),
      });
      setMessage(`Updated ${user.email}.`);
      await reload();
    } catch (failure) {
      setActionError(getErrorMessage(failure));
      await reload();
    } finally {
      setBusyId(null);
    }
  }

  async function deleteUser(user: AdminUser) {
    if (
      !window.confirm(
        `Delete ${user.email}? This permanently removes their exams, attempts, documents, questions, interview kits, and proctoring history.`,
      )
    ) {
      return;
    }
    setBusyId(user.id);
    setActionError(null);
    setMessage(null);
    try {
      await apiFetch(`/api/admin/users/${user.id}`, { method: "DELETE" });
      setMessage(`Deleted ${user.email}.`);
      await reload();
    } catch (failure) {
      setActionError(getErrorMessage(failure));
    } finally {
      setBusyId(null);
    }
  }

  async function toggleSubject(user: AdminUser, subjectId: number) {
    setBusyId(user.id);
    setActionError(null);
    setMessage(null);
    try {
      if (user.subjects.some((subject) => subject.id === subjectId)) {
        await apiFetch(`/api/admin/subjects/${subjectId}/admins/${user.id}`, {
          method: "DELETE",
        });
      } else {
        await apiFetch(`/api/admin/subjects/${subjectId}/admins`, {
          method: "POST",
          body: JSON.stringify({ userId: user.id }),
        });
      }
      await reload();
    } catch (failure) {
      setActionError(getErrorMessage(failure));
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Users"
        description="Manage accounts and roles. Subject admins are limited to their assigned subjects."
        action={
          <Button onClick={() => setShowCreate((value) => !value)}>
            {showCreate ? "Close" : "New user"}
          </Button>
        }
      />

      {message ? <Alert tone="success">{message}</Alert> : null}
      {actionError ? <Alert tone="error">{actionError}</Alert> : null}

      {showCreate ? (
        <Card>
          <CardHeader
            title="Create user"
            description="Passwords must be at least 10 characters and contain a letter and a number."
          />
          <form onSubmit={createUser} className="space-y-4 p-5">
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="Name" htmlFor="user-name">
                <Input
                  id="user-name"
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                  required
                  minLength={2}
                  maxLength={80}
                />
              </Field>
              <Field label="Email" htmlFor="user-email">
                <Input
                  id="user-email"
                  type="email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  required
                />
              </Field>
              <Field label="Temporary password" htmlFor="user-password">
                <Input
                  id="user-password"
                  type="password"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  required
                  minLength={10}
                  maxLength={128}
                  autoComplete="new-password"
                />
              </Field>
              <Field label="Role" htmlFor="user-role">
                <Select
                  id="user-role"
                  value={newRole}
                  onChange={(event) => {
                    setNewRole(event.target.value as Role);
                    setSubjectIds([]);
                  }}
                >
                  {ROLES.map((value) => (
                    <option key={value} value={value}>
                      {value
                        .toLowerCase()
                        .split("_")
                        .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
                        .join(" ")}
                    </option>
                  ))}
                </Select>
              </Field>
            </div>

            {newRole === "SUBJECT_ADMIN" ? (
              <div className="space-y-2">
                <p className="text-xs font-medium text-slate-700">Assign subjects (optional)</p>
                {subjectsData && subjectsData.items.length > 0 ? (
                  <div className="grid gap-1.5 sm:grid-cols-2 lg:grid-cols-3">
                    {subjectsData.items.map((subject) => {
                      const selected = subjectIds.includes(subject.id);
                      return (
                        <label
                          key={subject.id}
                          className={cn(
                            "flex cursor-pointer items-center gap-2 rounded-lg border px-3 py-2 text-sm",
                            selected
                              ? "border-indigo-300 bg-indigo-50 text-indigo-800"
                              : "border-slate-200 bg-white text-slate-600",
                          )}
                        >
                          <input
                            type="checkbox"
                            checked={selected}
                            onChange={() =>
                              setSubjectIds((previous) =>
                                selected
                                  ? previous.filter((id) => id !== subject.id)
                                  : [...previous, subject.id],
                              )
                            }
                          />
                          {subject.name}
                        </label>
                      );
                    })}
                  </div>
                ) : (
                  <p className="text-xs text-slate-500">
                    No subjects available yet. You can assign admins later from the subject page.
                  </p>
                )}
              </div>
            ) : null}

            <div className="flex justify-end">
              <Button type="submit" loading={creating} disabled={!name || !email || !password}>
                Create user
              </Button>
            </div>
          </form>
        </Card>
      ) : null}

      <Card>
        <div className="flex flex-col gap-3 border-b border-slate-100 p-4 lg:flex-row lg:items-center">
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
              placeholder="Search name or email…"
              aria-label="Search users"
            />
            <Button type="submit" variant="secondary">
              Search
            </Button>
          </form>
          <Select
            value={role}
            onChange={(event) => {
              setRole(event.target.value);
              setPage(1);
            }}
            aria-label="Filter by role"
            className="lg:w-44"
          >
            <option value="">All roles</option>
            {ROLES.map((value) => (
              <option key={value} value={value}>
                {value
                  .toLowerCase()
                  .split("_")
                  .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
                  .join(" ")}
              </option>
            ))}
          </Select>
          <Select
            value={status}
            onChange={(event) => {
              setStatus(event.target.value);
              setPage(1);
            }}
            aria-label="Filter by status"
            className="lg:w-40"
          >
            <option value="">All statuses</option>
            {USER_STATUSES.map((value) => (
              <option key={value} value={value}>
                {value.charAt(0) + value.slice(1).toLowerCase()}
              </option>
            ))}
          </Select>
        </div>

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
          <div className="flex items-center justify-center gap-2 py-12 text-sm text-slate-500">
            <Spinner /> Loading users…
          </div>
        ) : null}

        {data && data.items.length === 0 ? (
          <EmptyState
            title="No users found"
            description="Try adjusting your search or filters."
          />
        ) : null}

        {data && data.items.length > 0 ? (
          <>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-slate-100 text-sm">
                <thead className="bg-slate-50/60 text-left text-xs uppercase tracking-wide text-slate-500">
                  <tr>
                    <th className="px-5 py-3 font-medium">User</th>
                    <th className="px-5 py-3 font-medium">Role</th>
                    <th className="px-5 py-3 font-medium">Status</th>
                    <th className="px-5 py-3 font-medium">Subjects</th>
                    <th className="px-5 py-3 font-medium">Last login</th>
                    <th className="px-5 py-3 text-right font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {data.items.map((user) => {
                    const isSelf = user.id === currentUserId;
                    const canEdit = !isSelf;
                    return (
                      <tr key={user.id} className="align-top hover:bg-slate-50/60">
                        <td className="px-5 py-3">
                          <p className="font-medium text-slate-900">
                            {user.name}
                            {isSelf ? (
                              <span className="ml-1.5 text-[11px] text-slate-400">(you)</span>
                            ) : null}
                          </p>
                          <p className="text-xs text-slate-500">{user.email}</p>
                          <p className="mt-0.5 text-[11px] text-slate-400">
                            Joined {formatDateTime(user.createdAt)}
                          </p>
                        </td>
                        <td className="px-5 py-3">
                          {canEdit ? (
                            <Select
                              value={user.role}
                              disabled={busyId === user.id}
                              aria-label={`Role for ${user.email}`}
                              className="w-40"
                              onChange={(event) =>
                                void updateUser(user, { role: event.target.value as Role })
                              }
                            >
                              {ROLES.map((value) => (
                                <option key={value} value={value}>
                                  {value
                                    .toLowerCase()
                                    .split("_")
                                    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
                                    .join(" ")}
                                </option>
                              ))}
                            </Select>
                          ) : (
                            <Badge tone={user.role === "SUPER_ADMIN" ? "violet" : "slate"}>
                              {user.role}
                            </Badge>
                          )}
                        </td>
                        <td className="px-5 py-3">
                          {canEdit ? (
                            <Select
                              value={user.status}
                              disabled={busyId === user.id}
                              aria-label={`Status for ${user.email}`}
                              className="w-32"
                              onChange={(event) =>
                                void updateUser(user, {
                                  status: event.target.value as UserStatus,
                                })
                              }
                            >
                              {USER_STATUSES.map((value) => (
                                <option key={value} value={value}>
                                  {value.charAt(0) + value.slice(1).toLowerCase()}
                                </option>
                              ))}
                            </Select>
                          ) : (
                            <StatusBadge status={user.status} />
                          )}
                        </td>
                        <td className="px-5 py-3">
                          {user.role === "SUBJECT_ADMIN" ? (
                            <div className="max-w-56 space-y-1.5">
                              <div className="flex flex-wrap gap-1">
                                {user.subjects.map((subject) => (
                                  <button
                                    key={subject.id}
                                    type="button"
                                    disabled={busyId === user.id}
                                    onClick={() => void toggleSubject(user, subject.id)}
                                    title="Remove from subject"
                                    className="rounded-full bg-indigo-50 px-2 py-0.5 text-[11px] font-medium text-indigo-700 ring-1 ring-inset ring-indigo-200 hover:bg-rose-50 hover:text-rose-700 hover:ring-rose-200"
                                  >
                                    {subject.name} ×
                                  </button>
                                ))}
                                {user.subjects.length === 0 ? (
                                  <span className="text-[11px] text-slate-400">No subjects</span>
                                ) : null}
                              </div>
                              <select
                                value=""
                                disabled={busyId === user.id}
                                aria-label={`Add subject for ${user.email}`}
                                onChange={(event) => {
                                  if (event.target.value) {
                                    void toggleSubject(user, Number(event.target.value));
                                  }
                                }}
                                className="h-7 w-full rounded-md border border-slate-200 bg-white px-1.5 text-[11px] text-slate-600"
                              >
                                <option value="">+ Add subject…</option>
                                {(subjectsData?.items ?? [])
                                  .filter(
                                    (subject) =>
                                      !user.subjects.some((assigned) => assigned.id === subject.id),
                                  )
                                  .map((subject) => (
                                    <option key={subject.id} value={subject.id}>
                                      {subject.name}
                                    </option>
                                  ))}
                              </select>
                            </div>
                          ) : (
                            <span className="text-xs text-slate-400">—</span>
                          )}
                        </td>
                        <td className="whitespace-nowrap px-5 py-3 text-xs text-slate-500">
                          {user.lastLoginAt ? formatDateTime(user.lastLoginAt) : "Never"}
                        </td>
                        <td className="whitespace-nowrap px-5 py-3 text-right">
                          <Button
                            size="sm"
                            variant="ghost"
                            className="text-rose-600 hover:bg-rose-50 hover:text-rose-700"
                            onClick={() => void deleteUser(user)}
                            disabled={isSelf || busyId === user.id}
                            title={isSelf ? "You cannot delete your own account" : undefined}
                          >
                            Delete
                          </Button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            <div className="flex flex-col gap-2 border-t border-slate-100 px-5 py-3 text-xs text-slate-500 sm:flex-row sm:items-center sm:justify-between">
              <span>
                Page {data.pagination.page} of {data.pagination.totalPages} ·{" "}
                {data.pagination.total} users
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
