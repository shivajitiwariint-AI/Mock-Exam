"use client";

import { useState } from "react";
import { apiFetch, getErrorMessage } from "@/lib/client-api";
import { useApiData } from "@/lib/use-api";
import { formatDateTime } from "@/lib/format";
import type { UserStatus } from "@/types/api";
import {
  Alert,
  Button,
  Card,
  CardHeader,
  EmptyState,
  Field,
  Input,
  Spinner,
  StatusBadge,
} from "@/components/ui";

type SubjectAdminRow = {
  id: number;
  name: string;
  email: string;
  status: UserStatus;
  assignedAt: string;
};

export function SubjectAdmins({
  subjectId,
  isSuperAdmin,
  onRefresh,
}: {
  subjectId: number;
  isSuperAdmin: boolean;
  onRefresh: () => Promise<void> | void;
}) {
  const { data, error, loading, reload } = useApiData<SubjectAdminRow[]>(
    `/api/admin/subjects/${subjectId}/admins`,
  );
  const [email, setEmail] = useState("");
  const [assigning, setAssigning] = useState(false);
  const [busyId, setBusyId] = useState<number | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  async function assign(event: React.FormEvent) {
    event.preventDefault();
    setAssigning(true);
    setActionError(null);
    setMessage(null);
    try {
      await apiFetch(`/api/admin/subjects/${subjectId}/admins`, {
        method: "POST",
        body: JSON.stringify({ email: email.trim() }),
      });
      setMessage(`Assigned ${email.trim()} to this subject.`);
      setEmail("");
      await reload();
      await onRefresh();
    } catch (failure) {
      setActionError(getErrorMessage(failure));
    } finally {
      setAssigning(false);
    }
  }

  async function remove(admin: SubjectAdminRow) {
    if (!window.confirm(`Remove ${admin.name} from this subject?`)) return;
    setBusyId(admin.id);
    setActionError(null);
    setMessage(null);
    try {
      await apiFetch(`/api/admin/subjects/${subjectId}/admins/${admin.id}`, {
        method: "DELETE",
      });
      setMessage(`${admin.name} removed from this subject.`);
      await reload();
      await onRefresh();
    } catch (failure) {
      setActionError(getErrorMessage(failure));
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div className="grid gap-4 lg:grid-cols-3">
      <Card className="lg:col-span-2">
        <CardHeader
          title="Subject admins"
          description="Subject admins can manage content for this subject only."
        />
        {error ? (
          <div className="p-4">
            <Alert tone="error">{error}</Alert>
          </div>
        ) : null}
        {loading && !data ? (
          <div className="flex items-center justify-center gap-2 py-12 text-sm text-slate-500">
            <Spinner /> Loading admins…
          </div>
        ) : null}
        {data && data.length === 0 ? (
          <EmptyState
            title="No admins assigned"
            description="Super admins always have access. Assign subject admins to delegate content management."
          />
        ) : null}
        {data && data.length > 0 ? (
          <ul className="divide-y divide-slate-100">
            {data.map((admin) => (
              <li
                key={admin.id}
                className="flex flex-col gap-2 px-5 py-3 sm:flex-row sm:items-center sm:justify-between"
              >
                <div>
                  <p className="text-sm font-medium text-slate-900">{admin.name}</p>
                  <p className="text-xs text-slate-500">{admin.email}</p>
                  <p className="mt-0.5 text-[11px] text-slate-400">
                    Assigned {formatDateTime(admin.assignedAt)}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <StatusBadge status={admin.status} />
                  {isSuperAdmin ? (
                    <Button
                      size="sm"
                      variant="ghost"
                      className="text-rose-600 hover:bg-rose-50 hover:text-rose-700"
                      onClick={() => void remove(admin)}
                      loading={busyId === admin.id}
                    >
                      Remove
                    </Button>
                  ) : null}
                </div>
              </li>
            ))}
          </ul>
        ) : null}
        {message ? (
          <div className="p-4">
            <Alert tone="success">{message}</Alert>
          </div>
        ) : null}
        {actionError ? (
          <div className="p-4">
            <Alert tone="error">{actionError}</Alert>
          </div>
        ) : null}
      </Card>

      <Card>
        <CardHeader title="Assign an admin" />
        {isSuperAdmin ? (
          <form onSubmit={assign} className="space-y-4 p-5">
            <Field
              label="Admin email"
              htmlFor="admin-email"
              hint="The user must already have the Subject Admin role."
            >
              <Input
                id="admin-email"
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                required
                placeholder="name@example.com"
              />
            </Field>
            <Button type="submit" loading={assigning} disabled={!email.trim()}>
              Assign admin
            </Button>
          </form>
        ) : (
          <p className="p-5 text-xs text-slate-500">
            Only super admins can assign or remove subject admins.
          </p>
        )}
      </Card>
    </div>
  );
}
