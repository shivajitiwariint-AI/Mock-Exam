"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { apiFetch, getErrorMessage } from "@/lib/client-api";
import { useApiData } from "@/lib/use-api";
import { formatClock, formatDateTime, formatDuration, percent } from "@/lib/format";
import type { AttemptQuestion, AttemptView } from "@/types/api";
import {
  Alert,
  Badge,
  Button,
  Card,
  CardHeader,
  EmptyState,
  PageHeader,
  ProgressBar,
  Spinner,
  StatusBadge,
  cn,
} from "@/components/ui";

export default function AttemptPage() {
  const params = useParams<{ attemptId: string }>();
  const { data, error, loading, reload, setData } = useApiData<AttemptView>(
    params?.attemptId ? `/api/exam-attempts/${params.attemptId}` : null,
  );

  if (loading && !data) {
    return (
      <Card className="flex items-center justify-center gap-2 py-16 text-sm text-slate-500">
        <Spinner /> Loading attempt…
      </Card>
    );
  }

  if (error || !data) {
    return (
      <div className="space-y-4">
        <Alert tone="error">
          {error ?? "Attempt not found."}{" "}
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

  if (data.attempt.status === "IN_PROGRESS") {
    return (
      <ExamRunner
        key={data.attempt.id}
        view={data}
        onUpdate={(next) => setData(next)}
        onExpire={() => void reload()}
      />
    );
  }

  return <AttemptResultView view={data} />;
}

function ExamRunner({
  view,
  onUpdate,
  onExpire,
}: {
  view: AttemptView;
  onUpdate: (view: AttemptView) => void;
  onExpire: () => void;
}) {
  const total = view.questions.length;
  const [index, setIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string | null>>(() =>
    Object.fromEntries(view.questions.map((question) => [question.id, question.selectedOption])),
  );
  const [saving, setSaving] = useState(false);
  const [savedAt, setSavedAt] = useState<Date | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [clock, setClock] = useState(() => ({ now: Date.now(), offset: 0 }));
  const submittingRef = useRef(false);

  const remaining = Math.max(
    0,
    Math.floor(
      (new Date(view.attempt.expiresAt).getTime() - (clock.now + clock.offset)) / 1000,
    ),
  );

  useEffect(() => {
    const tick = () => {
      const now = Date.now();
      setClock({
        now,
        offset: new Date(view.attempt.serverTime).getTime() - now,
      });
    };
    const interval = setInterval(tick, 1000);
    return () => clearInterval(interval);
  }, [view.attempt.serverTime]);

  const submit = useCallback(
    async (auto = false) => {
      if (submittingRef.current) return;
      if (!auto && !window.confirm("Submit this attempt? You cannot change answers afterwards.")) {
        return;
      }

      submittingRef.current = true;
      setSubmitting(true);
      setSubmitError(null);
      try {
        const updated = await apiFetch<AttemptView>(
          `/api/exam-attempts/${view.attempt.id}/submit`,
          { method: "POST" },
        );
        onUpdate(updated);
      } catch (failure) {
        setSubmitError(getErrorMessage(failure));
        onExpire();
      } finally {
        submittingRef.current = false;
        setSubmitting(false);
      }
    },
    [onExpire, onUpdate, view.attempt.id],
  );

  useEffect(() => {
    if (remaining <= 0 && !submittingRef.current) {
      void submit(true);
    }
  }, [remaining, submit]);

  async function chooseOption(question: AttemptQuestion, key: string) {
    const nextValue = answers[question.id] === key ? null : key;
    setAnswers((previous) => ({ ...previous, [question.id]: nextValue }));
    setSaving(true);
    setSaveError(null);

    try {
      await apiFetch(`/api/exam-attempts/${view.attempt.id}/answers`, {
        method: "PUT",
        body: JSON.stringify({
          answers: [{ attemptQuestionId: question.id, selectedOption: nextValue }],
        }),
      });
      setSavedAt(new Date());
    } catch (failure) {
      setSaveError(getErrorMessage(failure));
    } finally {
      setSaving(false);
    }
  }

  const answeredCount = view.questions.filter((question) => answers[question.id]).length;
  const current = view.questions[index];
  const progress = total ? (answeredCount / total) * 100 : 0;
  const timerTone =
    remaining <= 60 ? "text-rose-600" : remaining <= 300 ? "text-amber-600" : "text-slate-900";

  return (
    <div className="space-y-5">
      <PageHeader
        title={view.exam.title}
        description={`${view.exam.subject.name} · Attempt ${view.attempt.attemptNumber}`}
        action={
          <div className="flex items-center gap-3">
            <div className="text-right">
              <p className="text-[11px] uppercase tracking-wide text-slate-400">Time left</p>
              <p className={cn("font-mono text-2xl font-semibold tabular-nums", timerTone)}>
                {formatClock(remaining)}
              </p>
            </div>
            <Button variant="danger" onClick={() => void submit(false)} loading={submitting}>
              Submit
            </Button>
          </div>
        }
      />

      {submitError ? <Alert tone="error">{submitError}</Alert> : null}
      {saveError ? <Alert tone="error">Could not save answer: {saveError}</Alert> : null}
      {remaining <= 0 ? (
        <Alert tone="warning">Time is up. Submitting your saved answers…</Alert>
      ) : null}

      <div className="grid gap-5 lg:grid-cols-[1fr_260px]">
        <Card>
          <div className="border-b border-slate-100 px-5 py-3">
            <div className="flex items-center justify-between text-xs text-slate-500">
              <span>
                Question {index + 1} of {total}
              </span>
              <span>
                {answeredCount} answered · {total - answeredCount} remaining
              </span>
            </div>
            <div className="mt-2">
              <ProgressBar value={progress} />
            </div>
          </div>

          {current ? (
            <div className="p-5 sm:p-6">
              <div className="flex items-center gap-2">
                <Badge tone="slate">{current.marks} mark{current.marks === 1 ? "" : "s"}</Badge>
                {answers[current.id] ? <Badge tone="indigo">Answered</Badge> : null}
              </div>
              <p className="mt-3 whitespace-pre-wrap text-base font-medium leading-7 text-slate-900">
                {current.questionText}
              </p>

              <div className="mt-5 space-y-2" role="radiogroup" aria-label="Answer options">
                {current.options.map((option) => {
                  const selected = answers[current.id] === option.key;
                  return (
                    <button
                      key={option.key}
                      type="button"
                      role="radio"
                      aria-checked={selected}
                      onClick={() => void chooseOption(current, option.key)}
                      className={cn(
                        "flex w-full items-start gap-3 rounded-xl border px-3 py-3 text-left transition-colors",
                        selected
                          ? "border-indigo-300 bg-indigo-50 ring-1 ring-indigo-200"
                          : "border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50",
                      )}
                    >
                      <span
                        className={cn(
                          "flex h-6 w-6 shrink-0 items-center justify-center rounded-full border text-xs font-semibold",
                          selected
                            ? "border-indigo-500 bg-indigo-600 text-white"
                            : "border-slate-300 text-slate-500",
                        )}
                      >
                        {option.key}
                      </span>
                      <span className="text-sm leading-6 text-slate-700">{option.text}</span>
                    </button>
                  );
                })}
              </div>

              <div className="mt-6 flex items-center justify-between gap-3">
                <Button
                  variant="secondary"
                  onClick={() => setIndex((value) => Math.max(0, value - 1))}
                  disabled={index === 0}
                >
                  Previous
                </Button>
                <div className="text-xs text-slate-400">
                  {saving ? "Saving…" : savedAt ? `Saved ${savedAt.toLocaleTimeString()}` : " "}
                </div>
                {index === total - 1 ? (
                  <Button variant="secondary" onClick={() => void submit(false)} loading={submitting}>
                    Review & submit
                  </Button>
                ) : (
                  <Button onClick={() => setIndex((value) => Math.min(total - 1, value + 1))}>
                    Next
                  </Button>
                )}
              </div>
            </div>
          ) : (
            <EmptyState title="This attempt has no questions" />
          )}
        </Card>

        <div className="space-y-4">
          <Card>
            <CardHeader title="Question palette" />
            <div className="grid grid-cols-5 gap-2 p-4">
              {view.questions.map((question, questionIndex) => {
                const answered = Boolean(answers[question.id]);
                return (
                  <button
                    key={question.id}
                    type="button"
                    onClick={() => setIndex(questionIndex)}
                    aria-label={`Go to question ${questionIndex + 1}`}
                    className={cn(
                      "flex h-9 items-center justify-center rounded-lg border text-xs font-semibold transition-colors",
                      questionIndex === index
                        ? "border-indigo-600 bg-indigo-600 text-white"
                        : answered
                          ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                          : "border-slate-200 bg-white text-slate-500 hover:bg-slate-50",
                    )}
                  >
                    {questionIndex + 1}
                  </button>
                );
              })}
            </div>
            <div className="border-t border-slate-100 px-4 py-3 text-[11px] text-slate-500">
              <p>Green means an answer is saved on the server.</p>
              <p className="mt-1">
                Closes {formatDateTime(view.exam.availabilityEnd)}
              </p>
            </div>
          </Card>

          <Card className="p-4 text-xs text-slate-500">
            <p className="font-medium text-slate-700">Grading</p>
            <p className="mt-1">
              +{view.exam.marksPerQuestion} for correct
              {view.exam.negativeMarks > 0
                ? ` · −${view.exam.negativeMarks} for incorrect`
                : " · no negative marking"}
            </p>
            <p className="mt-1">Pass mark {view.exam.passPercentage}%</p>
          </Card>
        </div>
      </div>
    </div>
  );
}

function AttemptResultView({ view }: { view: AttemptView }) {
  const result = view.result;
  const duration = result?.timeTakenSeconds ?? null;

  return (
    <div className="space-y-6">
      <PageHeader
        title={view.exam.title}
        description={`${view.exam.subject.name} · Attempt ${view.attempt.attemptNumber} · ${formatDateTime(
          view.attempt.submittedAt,
        )}`}
        action={<StatusBadge status={view.attempt.status} />}
      />

      {!result ? (
        <Alert tone="info">This attempt has been finalized. Results are not available yet.</Alert>
      ) : (
        <>
          <Card
            className={cn(
              "overflow-hidden",
              result.passed ? "border-emerald-200" : "border-rose-200",
            )}
          >
            <div className="grid gap-6 p-6 sm:grid-cols-[1.2fr_1fr] sm:items-center">
              <div>
                <Badge tone={result.passed ? "green" : "red"}>
                  {result.passed ? "Passed" : "Not passed"}
                </Badge>
                <p className="mt-3 text-4xl font-semibold tracking-tight text-slate-900">
                  {percent(result.percentage)}
                </p>
                <p className="mt-1 text-sm text-slate-500">
                  {result.score} of {result.maxScore} marks · {formatDuration(duration)} taken
                </p>
              </div>
              <dl className="grid grid-cols-3 gap-3 text-center">
                <div className="rounded-xl bg-emerald-50 px-3 py-3">
                  <dt className="text-[11px] uppercase tracking-wide text-emerald-700">Correct</dt>
                  <dd className="mt-1 text-xl font-semibold text-emerald-800">
                    {result.correctCount}
                  </dd>
                </div>
                <div className="rounded-xl bg-rose-50 px-3 py-3">
                  <dt className="text-[11px] uppercase tracking-wide text-rose-700">Incorrect</dt>
                  <dd className="mt-1 text-xl font-semibold text-rose-800">
                    {result.incorrectCount}
                  </dd>
                </div>
                <div className="rounded-xl bg-slate-100 px-3 py-3">
                  <dt className="text-[11px] uppercase tracking-wide text-slate-600">Skipped</dt>
                  <dd className="mt-1 text-xl font-semibold text-slate-700">
                    {result.unansweredCount}
                  </dd>
                </div>
              </dl>
            </div>
          </Card>

          <div className="flex flex-wrap items-center gap-2">
            <Link
              href="/dashboard"
              className="inline-flex h-10 items-center rounded-lg bg-indigo-600 px-4 text-sm font-medium text-white shadow-sm hover:bg-indigo-500"
            >
              Back to dashboard
            </Link>
            <Link
              href="/exams"
              className="inline-flex h-10 items-center rounded-lg border border-slate-300 bg-white px-4 text-sm font-medium text-slate-700 shadow-sm hover:bg-slate-50"
            >
              Browse exams
            </Link>
            <Link
              href={`/exams/${view.exam.id}`}
              className="inline-flex h-10 items-center rounded-lg px-4 text-sm font-medium text-slate-600 hover:bg-slate-100"
            >
              Exam details
            </Link>
          </div>

          <Card>
            <CardHeader
              title="Answer review"
              description={
                view.reviewAvailable
                  ? "Correct answers and explanations are shown below."
                  : "Answer review is not available for this attempt yet."
              }
            />
            {!view.reviewAvailable ? (
              <EmptyState
                title="Review unavailable"
                description={
                  view.exam.reviewPolicy === "AFTER_WINDOW_CLOSE"
                    ? `Answers become available after the exam window closes on ${formatDateTime(
                        view.exam.availabilityEnd,
                      )}.`
                    : "This exam does not reveal answers after submission."
                }
              />
            ) : (
              <ol className="divide-y divide-slate-100">
                {view.questions.map((question) => {
                  const correct = question.correctOption;
                  const selected = question.selectedOption;
                  const isCorrect = correct && selected === correct;
                  return (
                    <li key={question.id} className="px-5 py-4">
                      <div className="flex items-start justify-between gap-3">
                        <p className="whitespace-pre-wrap text-sm font-medium leading-6 text-slate-900">
                          {question.order}. {question.questionText}
                        </p>
                        <Badge
                          tone={
                            !selected ? "slate" : isCorrect ? "green" : "red"
                          }
                        >
                          {!selected ? "Skipped" : isCorrect ? "Correct" : "Incorrect"}
                        </Badge>
                      </div>
                      <ul className="mt-3 space-y-1.5">
                        {question.options.map((option) => {
                          const isAnswer = option.key === correct;
                          const isSelected = option.key === selected;
                          return (
                            <li
                              key={option.key}
                              className={cn(
                                "flex items-start gap-2 rounded-lg border px-3 py-2 text-sm",
                                isAnswer
                                  ? "border-emerald-200 bg-emerald-50 text-emerald-900"
                                  : isSelected
                                    ? "border-rose-200 bg-rose-50 text-rose-900"
                                    : "border-slate-200 bg-white text-slate-600",
                              )}
                            >
                              <span className="font-semibold">{option.key}.</span>
                              <span className="flex-1">{option.text}</span>
                              {isAnswer ? (
                                <span className="text-[11px] font-medium uppercase">correct</span>
                              ) : isSelected ? (
                                <span className="text-[11px] font-medium uppercase">your answer</span>
                              ) : null}
                            </li>
                          );
                        })}
                      </ul>
                      {question.explanation ? (
                        <p className="mt-3 rounded-lg bg-slate-50 px-3 py-2 text-xs leading-5 text-slate-600">
                          <span className="font-medium text-slate-700">Explanation: </span>
                          {question.explanation}
                        </p>
                      ) : null}
                    </li>
                  );
                })}
              </ol>
            )}
          </Card>
        </>
      )}
    </div>
  );
}
