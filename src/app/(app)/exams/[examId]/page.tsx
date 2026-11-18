"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useState } from "react";
import { apiFetch, getErrorMessage } from "@/lib/client-api";
import { useApiData } from "@/lib/use-api";
import { formatDateTime, formatDuration, percent } from "@/lib/format";
import type { AttemptView, StudentExamDetail } from "@/types/api";
import {
  Alert,
  Badge,
  Button,
  Card,
  CardHeader,
  EmptyState,
  PageHeader,
  Spinner,
  StatusBadge,
} from "@/components/ui";

export default function ExamDetailPage() {
  const params = useParams<{ examId: string }>();
  const router = useRouter();
  const { data, error, loading, reload } = useApiData<StudentExamDetail>(
    params?.examId ? `/api/exams/${params.examId}` : null,
  );
  const [starting, setStarting] = useState(false);
  const [startError, setStartError] = useState<string | null>(null);

  const inProgress = data?.attempts.find((attempt) => attempt.status === "IN_PROGRESS");

  async function startExam() {
    if (!data) return;
    setStarting(true);
    setStartError(null);
    try {
      const attempt = await apiFetch<AttemptView>(`/api/exams/${data.id}/start`, {
        method: "POST",
      });
      router.push(`/attempts/${attempt.attempt.id}`);
    } catch (startFailure) {
      setStartError(getErrorMessage(startFailure));
      await reload();
    } finally {
      setStarting(false);
    }
  }

  if (loading && !data) {
    return (
      <Card className="flex items-center justify-center gap-2 py-16 text-sm text-slate-500">
        <Spinner /> Loading exam…
      </Card>
    );
  }

  if (error || !data) {
    return (
      <div className="space-y-4">
        <Alert tone="error">
          {error ?? "Exam not found."}{" "}
          <button className="underline" onClick={() => void reload()}>
            Retry
          </button>
        </Alert>
        <Link href="/exams" className="text-sm font-medium text-indigo-600">
          ← Back to exams
        </Link>
      </div>
    );
  }

  const exhausted = data.attemptsRemaining === 0 && !inProgress;
  const canStart = data.availability === "OPEN" && !exhausted;

  return (
    <div className="space-y-6">
      <div>
        <Link href="/exams" className="text-xs font-medium text-slate-500 hover:text-slate-900">
          ← All exams
        </Link>
      </div>

      <PageHeader
        title={data.title}
        description={data.description ?? "No description provided."}
        action={
          inProgress ? (
            <Link
              href={`/attempts/${inProgress.id}`}
              className="inline-flex h-10 items-center rounded-lg bg-indigo-600 px-4 text-sm font-medium text-white shadow-sm hover:bg-indigo-500"
            >
              Resume attempt
            </Link>
          ) : (
            <Button onClick={() => void startExam()} loading={starting} disabled={!canStart}>
              {data.attemptsUsed > 0 ? "Start a new attempt" : "Start exam"}
            </Button>
          )
        }
      />

      {startError ? <Alert tone="error">{startError}</Alert> : null}

      {!canStart && !inProgress ? (
        <Alert tone="warning">
          {data.availability === "UPCOMING"
            ? `This exam opens on ${formatDateTime(data.availabilityStart)}.`
            : data.availability === "CLOSED"
              ? "This exam window has closed."
              : "You have no attempts remaining for this exam."}
        </Alert>
      ) : null}

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader title="Exam details" />
          <dl className="grid gap-4 p-5 sm:grid-cols-2">
            <div>
              <dt className="text-xs text-slate-400">Subject</dt>
              <dd className="mt-0.5">
                <Badge tone="violet">{data.subject.name}</Badge>
              </dd>
            </div>
            <div>
              <dt className="text-xs text-slate-400">Availability</dt>
              <dd className="mt-0.5">
                <StatusBadge status={data.availability} />
              </dd>
            </div>
            <div>
              <dt className="text-xs text-slate-400">Duration</dt>
              <dd className="mt-0.5 text-sm font-medium text-slate-800">
                {data.durationMinutes} minutes
              </dd>
            </div>
            <div>
              <dt className="text-xs text-slate-400">Questions</dt>
              <dd className="mt-0.5 text-sm font-medium text-slate-800">{data.questionCount}</dd>
            </div>
            <div>
              <dt className="text-xs text-slate-400">Pass mark</dt>
              <dd className="mt-0.5 text-sm font-medium text-slate-800">{data.passPercentage}%</dd>
            </div>
            <div>
              <dt className="text-xs text-slate-400">Marking</dt>
              <dd className="mt-0.5 text-sm font-medium text-slate-800">
                +{data.marksPerQuestion} per question
                {data.negativeMarks > 0 ? `, −${data.negativeMarks} for wrong answers` : ""}
              </dd>
            </div>
            <div>
              <dt className="text-xs text-slate-400">Attempts</dt>
              <dd className="mt-0.5 text-sm font-medium text-slate-800">
                {data.attemptsUsed} used of {data.maxAttempts}
              </dd>
            </div>
            <div>
              <dt className="text-xs text-slate-400">Answer review</dt>
              <dd className="mt-0.5 text-sm font-medium text-slate-800">
                {data.reviewPolicy === "AFTER_SUBMIT"
                  ? "After submission"
                  : data.reviewPolicy === "AFTER_WINDOW_CLOSE"
                    ? "After the exam window closes"
                    : "Not available"}
              </dd>
            </div>
            <div className="sm:col-span-2">
              <dt className="text-xs text-slate-400">Window</dt>
              <dd className="mt-0.5 text-sm text-slate-700">
                Opens {formatDateTime(data.availabilityStart)} · Closes{" "}
                {formatDateTime(data.availabilityEnd)}
              </dd>
            </div>
          </dl>
        </Card>

        <Card>
          <CardHeader title="Rules" />
          <div className="space-y-3 p-5 text-sm text-slate-600">
            <p>
              The timer starts when you begin and is enforced by the server. Answers are saved as
              you go.
            </p>
            <p>
              You can leave and resume an in-progress attempt until it expires. Submitting is
              final.
            </p>
            <p>
              Correct answers and explanations are revealed only according to the review policy
              above.
            </p>
          </div>
        </Card>
      </div>

      <Card>
        <CardHeader
          title="Your attempts"
          description="Every attempt for this exam, newest first."
          action={
            canStart ? (
              <Button size="sm" onClick={() => void startExam()} loading={starting}>
                {inProgress ? "Resume" : "New attempt"}
              </Button>
            ) : null
          }
        />
        {data.attempts.length === 0 ? (
          <EmptyState
            title="No attempts yet"
            description="Start the exam when you are ready. The clock only runs during an attempt."
          />
        ) : (
          <ul className="divide-y divide-slate-100">
            {data.attempts.map((attempt) => (
              <li
                key={attempt.id}
                className="flex flex-col gap-2 px-5 py-3 sm:flex-row sm:items-center sm:justify-between"
              >
                <div>
                  <p className="text-sm font-medium text-slate-900">
                    Attempt {attempt.attemptNumber}
                  </p>
                  <p className="text-xs text-slate-500">
                    Started {formatDateTime(attempt.startedAt)}
                    {attempt.submittedAt
                      ? ` · Submitted ${formatDateTime(attempt.submittedAt)}`
                      : ""}
                    {attempt.submittedAt
                      ? ` · ${formatDuration(
                          (new Date(attempt.submittedAt).getTime() -
                            new Date(attempt.startedAt).getTime()) /
                            1000,
                        )}`
                      : ""}
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <StatusBadge status={attempt.status} />
                  {attempt.percentage !== null ? (
                    <span
                      className={
                        attempt.passed
                          ? "text-sm font-semibold text-emerald-600"
                          : "text-sm font-semibold text-rose-600"
                      }
                    >
                      {percent(attempt.percentage)}
                    </span>
                  ) : null}
                  <Link
                    href={`/attempts/${attempt.id}`}
                    className="text-xs font-medium text-indigo-600 hover:text-indigo-500"
                  >
                    {attempt.status === "IN_PROGRESS" ? "Resume" : "View"}
                  </Link>
                </div>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}
