"use client";

import { useState } from "react";
import { apiFetch, getErrorMessage } from "@/lib/client-api";
import { formatDateTime } from "@/lib/format";
import type { SubjectDetail } from "@/types/api";
import {
  Alert,
  Badge,
  Button,
  Card,
  CardHeader,
  Field,
  Input,
  Select,
  Textarea,
} from "@/components/ui";

export function SubjectOverview({
  subject,
  isSuperAdmin,
  onRefresh,
}: {
  subject: SubjectDetail;
  isSuperAdmin: boolean;
  onRefresh: () => Promise<void> | void;
}) {
  const [name, setName] = useState(subject.name);
  const [description, setDescription] = useState(subject.description ?? "");
  const [status, setStatus] = useState(subject.status);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function save(event: React.FormEvent) {
    event.preventDefault();
    setSaving(true);
    setError(null);
    setMessage(null);
    try {
      await apiFetch(`/api/admin/subjects/${subject.id}`, {
        method: "PATCH",
        body: JSON.stringify({
          name,
          description: description.trim() || null,
          ...(isSuperAdmin ? { status } : {}),
        }),
      });
      setMessage("Subject updated.");
      await onRefresh();
    } catch (failure) {
      setError(getErrorMessage(failure));
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="grid gap-4 lg:grid-cols-3">
      <Card className="lg:col-span-2">
        <CardHeader title="Subject details" description={`Created ${formatDateTime(subject.createdAt)}`} />
        <form onSubmit={save} className="space-y-4 p-5">
          <Field label="Name" htmlFor="subject-name">
            <Input
              id="subject-name"
              value={name}
              onChange={(event) => setName(event.target.value)}
              required
              minLength={2}
              maxLength={120}
            />
          </Field>
          <Field label="Description" htmlFor="subject-description" hint="Shown to students where relevant.">
            <Textarea
              id="subject-description"
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              rows={4}
              maxLength={2000}
            />
          </Field>
          {isSuperAdmin ? (
            <Field
              label="Status"
              htmlFor="subject-status"
              hint="Inactive subjects are hidden from students."
            >
              <Select
                id="subject-status"
                value={status}
                onChange={(event) => setStatus(event.target.value as typeof status)}
              >
                <option value="ACTIVE">Active</option>
                <option value="INACTIVE">Inactive</option>
              </Select>
            </Field>
          ) : null}

          {message ? <Alert tone="success">{message}</Alert> : null}
          {error ? <Alert tone="error">{error}</Alert> : null}

          <div className="flex justify-end">
            <Button type="submit" loading={saving} disabled={!name.trim()}>
              Save changes
            </Button>
          </div>
        </form>
      </Card>

      <div className="space-y-4">
        <Card>
          <CardHeader title="At a glance" />
          <dl className="space-y-3 p-5 text-sm">
            <div className="flex items-center justify-between">
              <dt className="text-slate-500">Slug</dt>
              <dd className="font-mono text-xs text-slate-700">/{subject.slug}</dd>
            </div>
            <div className="flex items-center justify-between">
              <dt className="text-slate-500">Documents</dt>
              <dd className="font-medium text-slate-800">{subject.documentCount}</dd>
            </div>
            <div className="flex items-center justify-between">
              <dt className="text-slate-500">Questions</dt>
              <dd className="font-medium text-slate-800">{subject.questionCount}</dd>
            </div>
            <div className="flex items-center justify-between">
              <dt className="text-slate-500">Exams</dt>
              <dd className="font-medium text-slate-800">{subject.examCount}</dd>
            </div>
            <div className="flex items-center justify-between">
              <dt className="text-slate-500">Last updated</dt>
              <dd className="text-xs text-slate-600">{formatDateTime(subject.updatedAt)}</dd>
            </div>
          </dl>
        </Card>

        <Card>
          <CardHeader title="Topics" description="Manage from the Topics tab." />
          <div className="flex flex-wrap gap-1.5 p-5">
            {subject.topics.length === 0 ? (
              <p className="text-xs text-slate-500">No topics yet.</p>
            ) : (
              subject.topics.map((topic) => (
                <Badge key={topic.id} tone="indigo">
                  {topic.name}
                </Badge>
              ))
            )}
          </div>
        </Card>

        <Card>
          <CardHeader title="Assigned admins" />
          <ul className="divide-y divide-slate-100 text-sm">
            {subject.admins.length === 0 ? (
              <li className="px-5 py-4 text-xs text-slate-500">No subject admins assigned.</li>
            ) : (
              subject.admins.map((admin) => (
                <li key={admin.id} className="px-5 py-3">
                  <p className="font-medium text-slate-800">{admin.name}</p>
                  <p className="text-xs text-slate-500">{admin.email}</p>
                </li>
              ))
            )}
          </ul>
        </Card>
      </div>
    </div>
  );
}
