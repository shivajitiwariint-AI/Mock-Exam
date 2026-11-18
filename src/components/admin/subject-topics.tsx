"use client";

import { useState } from "react";
import { apiFetch, getErrorMessage } from "@/lib/client-api";
import { useApiData } from "@/lib/use-api";
import type { Topic } from "@/types/api";
import {
  Alert,
  Badge,
  Button,
  Card,
  CardHeader,
  EmptyState,
  Field,
  Input,
  Spinner,
  Textarea,
} from "@/components/ui";

export function SubjectTopics({
  subjectId,
  onRefresh,
}: {
  subjectId: string;
  onRefresh: () => Promise<void> | void;
}) {
  const { data, error, loading, reload } = useApiData<Topic[]>(
    `/api/admin/subjects/${subjectId}/topics`,
  );
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [creating, setCreating] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  async function addTopic(event: React.FormEvent) {
    event.preventDefault();
    setCreating(true);
    setActionError(null);
    try {
      await apiFetch(`/api/admin/subjects/${subjectId}/topics`, {
        method: "POST",
        body: JSON.stringify({
          name: name.trim(),
          description: description.trim() || undefined,
        }),
      });
      setName("");
      setDescription("");
      await reload();
      await onRefresh();
    } catch (failure) {
      setActionError(getErrorMessage(failure));
    } finally {
      setCreating(false);
    }
  }

  async function removeTopic(topic: Topic) {
    if (
      !window.confirm(
        `Delete "${topic.name}"? Questions and exams linked to it become unassigned.`,
      )
    ) {
      return;
    }
    setDeletingId(topic.id);
    setActionError(null);
    try {
      await apiFetch(`/api/admin/topics/${topic.id}`, { method: "DELETE" });
      await reload();
      await onRefresh();
    } catch (failure) {
      setActionError(getErrorMessage(failure));
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <div className="grid gap-4 lg:grid-cols-3">
      <Card className="lg:col-span-2">
        <CardHeader
          title="Topics"
          description="Topics group questions and exams. Students' weak-topic insights use them."
        />
        {error ? (
          <div className="p-4">
            <Alert tone="error">{error}</Alert>
          </div>
        ) : null}
        {loading && !data ? (
          <div className="flex items-center justify-center gap-2 py-12 text-sm text-slate-500">
            <Spinner /> Loading topics…
          </div>
        ) : null}
        {data && data.length === 0 ? (
          <EmptyState
            title="No topics yet"
            description="Add topics to organise the question bank."
          />
        ) : null}
        {data && data.length > 0 ? (
          <ul className="divide-y divide-slate-100">
            {data.map((topic) => (
              <li
                key={topic.id}
                className="flex flex-col gap-2 px-5 py-3 sm:flex-row sm:items-start sm:justify-between"
              >
                <div className="min-w-0">
                  <p className="text-sm font-medium text-slate-900">{topic.name}</p>
                  {topic.description ? (
                    <p className="mt-0.5 text-xs text-slate-500">{topic.description}</p>
                  ) : null}
                  <div className="mt-1.5 flex gap-1.5">
                    <Badge tone="slate">{topic.questionCount} questions</Badge>
                    <Badge tone="slate">{topic.examCount} exams</Badge>
                  </div>
                </div>
                <Button
                  size="sm"
                  variant="ghost"
                  className="text-rose-600 hover:bg-rose-50 hover:text-rose-700"
                  loading={deletingId === topic.id}
                  onClick={() => void removeTopic(topic)}
                >
                  Delete
                </Button>
              </li>
            ))}
          </ul>
        ) : null}
        {actionError ? (
          <div className="p-4">
            <Alert tone="error">{actionError}</Alert>
          </div>
        ) : null}
      </Card>

      <Card>
        <CardHeader title="Add topic" />
        <form onSubmit={addTopic} className="space-y-4 p-5">
          <Field label="Name" htmlFor="topic-name">
            <Input
              id="topic-name"
              value={name}
              onChange={(event) => setName(event.target.value)}
              required
              minLength={2}
              maxLength={120}
              placeholder="e.g. Hypothesis testing"
            />
          </Field>
          <Field label="Description" htmlFor="topic-description" hint="Optional.">
            <Textarea
              id="topic-description"
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              rows={3}
              maxLength={2000}
            />
          </Field>
          <Button type="submit" loading={creating} disabled={!name.trim()}>
            Add topic
          </Button>
        </form>
      </Card>
    </div>
  );
}
