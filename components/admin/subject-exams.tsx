"use client";

import { useState } from "react";
import { apiFetch, getErrorMessage } from "@/lib/client-api";
import { useApiData } from "@/lib/use-api";
import { formatDateTime, toDateTimeLocal } from "@/lib/format";
import type { AdminExam, Paginated, ReviewPolicy, SubjectDetail } from "@/types/api";
import {
  Alert,
  Badge,
  Button,
  Card,
  CardHeader,
  EmptyState,
  Field,
  Input,
  Select,
  Spinner,
  StatusBadge,
  Textarea,
} from "@/components/ui";

const STATUS_FILTERS = ["", "DRAFT", "PUBLISHED", "UNPUBLISHED", "ARCHIVED"] as const;

function weekFromNow() {
  return new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
}

export function SubjectExams({
  subjectId,
  subject,
  onRefresh,
}: {
  subjectId: number;
  subject: SubjectDetail;
  onRefresh: () => Promise<void> | void;
}) {
  const [status, setStatus] = useState("");
  const [page, setPage] = useState(1);
  const query = new URLSearchParams({ page: String(page), pageSize: "10" });
  if (status) query.set("status", status);

  const { data, error, loading, reload } = useApiData<Paginated<AdminExam>>(
    `/api/admin/subjects/${subjectId}/exams?${query.toString()}`,
  );

  const [showCreate, setShowCreate] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [topicId, setTopicId] = useState("");
  const [durationMinutes, setDurationMinutes] = useState("30");
  const [passPercentage, setPassPercentage] = useState("50");
  const [marksPerQuestion, setMarksPerQuestion] = useState("1");
  const [negativeMarks, setNegativeMarks] = useState("0");
  const [maxAttempts, setMaxAttempts] = useState("1");
  const [reviewPolicy, setReviewPolicy] = useState<ReviewPolicy>("AFTER_SUBMIT");
  const [shuffleQuestions, setShuffleQuestions] = useState(false);
  const [shuffleOptions, setShuffleOptions] = useState(true);
  const [availabilityStart, setAvailabilityStart] = useState(() =>
    toDateTimeLocal(new Date()),
  );
  const [availabilityEnd, setAvailabilityEnd] = useState(() =>
    toDateTimeLocal(weekFromNow()),
  );
  const [randomCount, setRandomCount] = useState("5");
  const [creating, setCreating] = useState(false);

  const [message, setMessage] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<number | null>(null);

  async function createExam(event: React.FormEvent) {
    event.preventDefault();
    setCreating(true);
    setActionError(null);
    setMessage(null);
    try {
      await apiFetch(`/api/admin/subjects/${subjectId}/exams`, {
        method: "POST",
        body: JSON.stringify({
          title: title.trim(),
          description: description.trim() || undefined,
          topicId: topicId || undefined,
          durationMinutes: Number(durationMinutes),
          passPercentage: Number(passPercentage),
          marksPerQuestion: Number(marksPerQuestion),
          negativeMarks: Number(negativeMarks),
          maxAttempts: Number(maxAttempts),
          shuffleQuestions,
          shuffleOptions,
          reviewPolicy,
          availabilityStart: new Date(availabilityStart).toISOString(),
          availabilityEnd: new Date(availabilityEnd).toISOString(),
          randomCount: Number(randomCount),
        }),
      });
      setMessage("Exam created as a draft. Review the question set, then publish.");
      setShowCreate(false);
      setTitle("");
      setDescription("");
      setPage(1);
      await reload();
      await onRefresh();
    } catch (failure) {
      setActionError(getErrorMessage(failure));
    } finally {
      setCreating(false);
    }
  }

  async function togglePublish(exam: AdminExam) {
    const publish = exam.status !== "PUBLISHED";
    if (
      !window.confirm(
        publish
          ? "Publish this exam? Students will be able to take it during its window."
          : "Unpublish this exam? Students can no longer start new attempts.",
      )
    ) {
      return;
    }
    setBusyId(exam.id);
    setActionError(null);
    setMessage(null);
    try {
      await apiFetch(`/api/admin/exams/${exam.id}/publish`, {
        method: "POST",
        body: JSON.stringify({ published: publish }),
      });
      setMessage(publish ? "Exam published." : "Exam unpublished.");
      await reload();
      await onRefresh();
    } catch (failure) {
      setActionError(getErrorMessage(failure));
    } finally {
      setBusyId(null);
    }
  }

  async function archive(exam: AdminExam) {
    if (!window.confirm("Archive this exam? This cannot be undone from the UI.")) return;
    setBusyId(exam.id);
    setActionError(null);
    setMessage(null);
    try {
      await apiFetch(`/api/admin/exams/${exam.id}`, { method: "DELETE" });
      setMessage("Exam archived.");
      await reload();
      await onRefresh();
    } catch (failure) {
      setActionError(getErrorMessage(failure));
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <Button onClick={() => setShowCreate((value) => !value)}>
          {showCreate ? "Close form" : "New exam"}
        </Button>
        <p className="text-xs text-slate-500">
          Publishing requires approved questions and a window that has not ended.
        </p>
      </div>

      {message ? <Alert tone="success">{message}</Alert> : null}
      {actionError ? <Alert tone="error">{actionError}</Alert> : null}

      {showCreate ? (
        <Card>
          <CardHeader
            title="Create exam"
            description="Questions are drawn from approved MCQ questions in this subject."
          />
          <form onSubmit={createExam} className="space-y-4 p-5">
            <Field label="Title" htmlFor="exam-title">
              <Input
                id="exam-title"
                value={title}
                onChange={(event) => setTitle(event.target.value)}
                required
                minLength={3}
                maxLength={200}
              />
            </Field>
            <Field label="Description" htmlFor="exam-description" hint="Optional.">
              <Textarea
                id="exam-description"
                value={description}
                onChange={(event) => setDescription(event.target.value)}
                rows={2}
                maxLength={4000}
              />
            </Field>

            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              <Field label="Topic" htmlFor="exam-topic">
                <Select
                  id="exam-topic"
                  value={topicId}
                  onChange={(event) => setTopicId(event.target.value)}
                >
                  <option value="">Whole subject</option>
                  {subject.topics.map((topic) => (
                    <option key={topic.id} value={topic.id}>
                      {topic.name}
                    </option>
                  ))}
                </Select>
              </Field>
              <Field label="Duration (minutes)" htmlFor="exam-duration">
                <Input
                  id="exam-duration"
                  type="number"
                  min={1}
                  max={600}
                  value={durationMinutes}
                  onChange={(event) => setDurationMinutes(event.target.value)}
                  required
                />
              </Field>
              <Field label="Random questions" htmlFor="exam-random" hint="Selected on creation.">
                <Input
                  id="exam-random"
                  type="number"
                  min={1}
                  max={100}
                  value={randomCount}
                  onChange={(event) => setRandomCount(event.target.value)}
                  required
                />
              </Field>
              <Field label="Pass %" htmlFor="exam-pass">
                <Input
                  id="exam-pass"
                  type="number"
                  min={0}
                  max={100}
                  value={passPercentage}
                  onChange={(event) => setPassPercentage(event.target.value)}
                  required
                />
              </Field>
              <Field label="Marks per question" htmlFor="exam-marks">
                <Input
                  id="exam-marks"
                  type="number"
                  min={1}
                  max={100}
                  value={marksPerQuestion}
                  onChange={(event) => setMarksPerQuestion(event.target.value)}
                  required
                />
              </Field>
              <Field label="Negative marks" htmlFor="exam-negative">
                <Input
                  id="exam-negative"
                  type="number"
                  min={0}
                  max={100}
                  value={negativeMarks}
                  onChange={(event) => setNegativeMarks(event.target.value)}
                  required
                />
              </Field>
              <Field label="Max attempts" htmlFor="exam-attempts">
                <Input
                  id="exam-attempts"
                  type="number"
                  min={1}
                  max={10}
                  value={maxAttempts}
                  onChange={(event) => setMaxAttempts(event.target.value)}
                  required
                />
              </Field>
              <Field label="Review policy" htmlFor="exam-review">
                <Select
                  id="exam-review"
                  value={reviewPolicy}
                  onChange={(event) => setReviewPolicy(event.target.value as ReviewPolicy)}
                >
                  <option value="AFTER_SUBMIT">After submission</option>
                  <option value="AFTER_WINDOW_CLOSE">After window closes</option>
                  <option value="NEVER">Never</option>
                </Select>
              </Field>
              <div className="flex flex-col justify-end gap-2 text-sm">
                <label className="flex items-center gap-2 text-slate-600">
                  <input
                    type="checkbox"
                    checked={shuffleQuestions}
                    onChange={(event) => setShuffleQuestions(event.target.checked)}
                  />
                  Shuffle questions
                </label>
                <label className="flex items-center gap-2 text-slate-600">
                  <input
                    type="checkbox"
                    checked={shuffleOptions}
                    onChange={(event) => setShuffleOptions(event.target.checked)}
                  />
                  Shuffle options
                </label>
              </div>
              <Field label="Opens" htmlFor="exam-start">
                <Input
                  id="exam-start"
                  type="datetime-local"
                  value={availabilityStart}
                  onChange={(event) => setAvailabilityStart(event.target.value)}
                  required
                />
              </Field>
              <Field label="Closes" htmlFor="exam-end">
                <Input
                  id="exam-end"
                  type="datetime-local"
                  value={availabilityEnd}
                  onChange={(event) => setAvailabilityEnd(event.target.value)}
                  required
                />
              </Field>
            </div>

            <div className="flex justify-end gap-2">
              <Button type="button" variant="secondary" onClick={() => setShowCreate(false)}>
                Cancel
              </Button>
              <Button type="submit" loading={creating} disabled={!title.trim()}>
                Create draft
              </Button>
            </div>
          </form>
        </Card>
      ) : null}

      <Card>
        <div className="flex items-center justify-between gap-3 border-b border-slate-100 px-4 py-3">
          <p className="text-xs text-slate-500">Drafts stay hidden from students until published.</p>
          <Select
            value={status}
            onChange={(event) => {
              setStatus(event.target.value);
              setPage(1);
            }}
            aria-label="Filter exams by status"
            className="w-44"
          >
            {STATUS_FILTERS.map((value) => (
              <option key={value || "all"} value={value}>
                {value === ""
                  ? "All statuses"
                  : value.charAt(0) + value.slice(1).toLowerCase()}
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
            <Spinner /> Loading exams…
          </div>
        ) : null}

        {data && data.items.length === 0 ? (
          <EmptyState
            title="No exams yet"
            description="Create a draft exam from the approved question bank."
          />
        ) : null}

        {data && data.items.length > 0 ? (
          <>
            <ul className="divide-y divide-slate-100">
              {data.items.map((exam) => (
                <li key={exam.id} className="px-5 py-4">
                  <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="text-sm font-semibold text-slate-900">{exam.title}</p>
                        <StatusBadge status={exam.status} />
                      </div>
                      <p className="mt-0.5 text-xs text-slate-500">
                        {formatDateTime(exam.availabilityStart)} →{" "}
                        {formatDateTime(exam.availabilityEnd)}
                      </p>
                      <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
                        <Badge tone="slate">{exam.durationMinutes} min</Badge>
                        <Badge tone="slate">{exam.questionCount} questions</Badge>
                        <Badge tone="slate">{exam.attemptCount} attempts</Badge>
                        <Badge tone="slate">Pass {exam.passPercentage}%</Badge>
                        {exam.topic ? <Badge tone="indigo">{exam.topic.name}</Badge> : null}
                      </div>
                    </div>
                    <div className="flex shrink-0 flex-wrap items-center gap-1">
                      {exam.status !== "ARCHIVED" ? (
                        <Button
                          size="sm"
                          variant={exam.status === "PUBLISHED" ? "secondary" : "primary"}
                          onClick={() => void togglePublish(exam)}
                          loading={busyId === exam.id}
                        >
                          {exam.status === "PUBLISHED" ? "Unpublish" : "Publish"}
                        </Button>
                      ) : null}
                      {exam.status !== "ARCHIVED" ? (
                        <Button
                          size="sm"
                          variant="ghost"
                          className="text-rose-600 hover:bg-rose-50 hover:text-rose-700"
                          onClick={() => void archive(exam)}
                          disabled={busyId === exam.id}
                        >
                          Archive
                        </Button>
                      ) : null}
                    </div>
                  </div>
                </li>
              ))}
            </ul>

            <div className="flex flex-col gap-2 border-t border-slate-100 px-5 py-3 text-xs text-slate-500 sm:flex-row sm:items-center sm:justify-between">
              <span>
                Page {data.pagination.page} of {data.pagination.totalPages} ·{" "}
                {data.pagination.total} exams
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
