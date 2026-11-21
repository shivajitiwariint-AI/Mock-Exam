"use client";

import { useEffect, useState } from "react";
import { apiFetch, getErrorMessage } from "@/lib/client-api";
import { useApiData } from "@/lib/use-api";
import { formatDateTime } from "@/lib/format";
import type { Difficulty, Paginated, QuestionRecord, SubjectDetail } from "@/types/api";
import {
  Alert,
  Badge,
  Button,
  Card,
  CardHeader,
  EmptyState,
  Field,
  Input,
  ProgressBar,
  Select,
  Spinner,
  StatusBadge,
  Textarea,
  cn,
} from "@/components/ui";
import { FormattedText } from "@/components/formatted-text";

const LETTERS = ["A", "B", "C", "D", "E", "F"];
const STATUS_FILTERS = [
  "",
  "DRAFT",
  "PENDING_REVIEW",
  "APPROVED",
  "REJECTED",
  "ARCHIVED",
] as const;

type OptionDraft = { key: string; text: string };

type GenerationJob = {
  id: number;
  status: "QUEUED" | "RUNNING" | "COMPLETED" | "FAILED";
  progress: number;
  progressMessage: string | null;
  lastError: string | null;
};

function emptyOptions(): OptionDraft[] {
  return LETTERS.slice(0, 4).map((key) => ({ key, text: "" }));
}

export function SubjectQuestions({
  subjectId,
  subject,
  onRefresh,
}: {
  subjectId: number;
  subject: SubjectDetail;
  onRefresh: () => Promise<void> | void;
}) {
  const [status, setStatus] = useState("");
  const [topicId, setTopicId] = useState("");
  const [search, setSearch] = useState("");
  const [appliedSearch, setAppliedSearch] = useState("");
  const [page, setPage] = useState(1);

  const query = new URLSearchParams({ page: String(page), pageSize: "10" });
  if (status) query.set("status", status);
  if (topicId) query.set("topicId", topicId);
  if (appliedSearch) query.set("search", appliedSearch);

  const { data, error, loading, reload } = useApiData<Paginated<QuestionRecord>>(
    `/api/admin/subjects/${subjectId}/questions?${query.toString()}`,
  );

  const [showCreate, setShowCreate] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [questionType, setQuestionType] = useState<"MCQ" | "SUBJECTIVE">("MCQ");
  const [questionText, setQuestionText] = useState("");
  const [options, setOptions] = useState<OptionDraft[]>(emptyOptions);
  const [correctOption, setCorrectOption] = useState("A");
  const [explanation, setExplanation] = useState("");
  const [difficulty, setDifficulty] = useState<Difficulty>("MEDIUM");
  const [questionTopicId, setQuestionTopicId] = useState("");
  const [initialStatus, setInitialStatus] = useState<"DRAFT" | "PENDING_REVIEW">(
    "PENDING_REVIEW",
  );
  const [creating, setCreating] = useState(false);

  const [showGenerate, setShowGenerate] = useState(false);
  const [genTopicId, setGenTopicId] = useState("");
  const [genCount, setGenCount] = useState("3");
  const [genDifficulty, setGenDifficulty] = useState<Difficulty>("MEDIUM");
  const [genInstructions, setGenInstructions] = useState("");
  const [generating, setGenerating] = useState(false);
  const [generationJob, setGenerationJob] = useState<GenerationJob | null>(null);

  const [message, setMessage] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<number | null>(null);

  const generationJobId = generationJob?.id ?? null;
  const generationJobStatus = generationJob?.status ?? null;

  useEffect(() => {
    if (
      !generationJobId ||
      generationJobStatus === "COMPLETED" ||
      generationJobStatus === "FAILED"
    ) {
      return;
    }

    let cancelled = false;
    const poll = async () => {
      try {
        const job = await apiFetch<GenerationJob>(`/api/admin/jobs/${generationJobId}`);
        if (cancelled) return;
        if (job.status === "COMPLETED") {
          setGenerationJob(null);
          setMessage(job.progressMessage ?? "AI question generation complete.");
          await reload();
          await onRefresh();
        } else if (job.status === "FAILED") {
          setGenerationJob(null);
          setActionError(job.lastError ?? "AI question generation failed.");
        } else {
          setGenerationJob(job);
        }
      } catch (failure) {
        if (!cancelled) setActionError(getErrorMessage(failure));
      }
    };

    const timer = setInterval(() => void poll(), 2000);
    void poll();
    return () => {
      cancelled = true;
      clearInterval(timer);
    };
  }, [generationJobId, generationJobStatus, onRefresh, reload]);

  function setOptionText(index: number, text: string) {
    setOptions((previous) =>
      previous.map((option, optionIndex) =>
        optionIndex === index ? { ...option, text } : option,
      ),
    );
  }

  function addOption() {
    if (options.length >= LETTERS.length) return;
    const key = LETTERS.find((letter) => !options.some((option) => option.key === letter));
    if (!key) return;
    setOptions((previous) => [...previous, { key, text: "" }]);
  }

  function removeOption(index: number) {
    if (options.length <= 2) return;
    const next = options.filter((_, optionIndex) => optionIndex !== index);
    const remapped = next.map((option, optionIndex) => ({
      ...option,
      key: LETTERS[optionIndex],
    }));
    setOptions(remapped);
    if (!remapped.some((option) => option.key === correctOption)) {
      setCorrectOption(remapped[0]?.key ?? "A");
    }
  }

  function resetQuestionForm() {
    setEditingId(null);
    setQuestionType("MCQ");
    setQuestionText("");
    setOptions(emptyOptions());
    setCorrectOption("A");
    setExplanation("");
    setDifficulty("MEDIUM");
    setQuestionTopicId("");
    setInitialStatus("PENDING_REVIEW");
  }

  function startEdit(question: QuestionRecord) {
    setActionError(null);
    setMessage(null);
    setEditingId(question.id);
    setQuestionType(question.type);
    setQuestionText(question.questionText);
    setOptions(question.options.map((option) => ({ key: option.key, text: option.text })));
    setCorrectOption(question.correctOption ?? "A");
    setExplanation(question.explanation ?? "");
    setDifficulty(question.difficulty);
    setQuestionTopicId(String(question.topic?.id ?? ""));
    setShowCreate(true);
  }

  async function createQuestion(event: React.FormEvent) {
    event.preventDefault();
    setCreating(true);
    setActionError(null);
    setMessage(null);

    const payload = {
      type: questionType,
      questionText: questionText.trim(),
      options:
        questionType === "MCQ"
          ? options.map((option) => ({ key: option.key, text: option.text.trim() }))
          : [],
      correctOption: questionType === "MCQ" ? correctOption : null,
      explanation: explanation.trim() || undefined,
      difficulty,
      topicId: questionTopicId || undefined,
    };

    try {
      if (editingId) {
        await apiFetch(`/api/admin/questions/${editingId}`, {
          method: "PATCH",
          body: JSON.stringify(payload),
        });
        setMessage(
          "Question updated. If it was approved, it is now back in the review queue until re-approved.",
        );
      } else {
        await apiFetch(`/api/admin/subjects/${subjectId}/questions`, {
          method: "POST",
          body: JSON.stringify({ ...payload, status: initialStatus }),
        });
        setMessage("Question created.");
      }
      resetQuestionForm();
      setShowCreate(false);
      setPage(1);
      await reload();
      await onRefresh();
    } catch (failure) {
      setActionError(getErrorMessage(failure));
    } finally {
      setCreating(false);
    }
  }

  async function generateQuestions(event: React.FormEvent) {
    event.preventDefault();
    setGenerating(true);
    setActionError(null);
    setMessage(null);
    try {
      const result = await apiFetch<{ job: { id: number } }>(
        `/api/admin/subjects/${subjectId}/questions/generate`,
        {
          method: "POST",
          body: JSON.stringify({
            topicId: genTopicId || undefined,
            count: Number(genCount),
            difficulty: genDifficulty,
            instructions: genInstructions.trim() || undefined,
          }),
        },
      );
      setGenerationJob({
        id: result.job.id,
        status: "QUEUED",
        progress: 5,
        progressMessage: "Question generation queued...",
        lastError: null,
      });
      setShowGenerate(false);
      setMessage("AI question generation started.");
    } catch (failure) {
      setActionError(getErrorMessage(failure));
    } finally {
      setGenerating(false);
    }
  }

  async function review(question: QuestionRecord, action: "approve" | "reject") {
    setBusyId(question.id);
    setActionError(null);
    setMessage(null);
    try {
      await apiFetch(`/api/admin/questions/${question.id}/${action}`, { method: "POST" });
      setMessage(`Question ${action === "approve" ? "approved" : "rejected"}.`);
      await reload();
      await onRefresh();
    } catch (failure) {
      setActionError(getErrorMessage(failure));
    } finally {
      setBusyId(null);
    }
  }

  async function archive(question: QuestionRecord) {
    if (!window.confirm("Archive this question? It can no longer be used in new exams.")) return;
    setBusyId(question.id);
    setActionError(null);
    setMessage(null);
    try {
      await apiFetch(`/api/admin/questions/${question.id}`, { method: "DELETE" });
      setMessage("Question archived.");
      await reload();
      await onRefresh();
    } catch (failure) {
      setActionError(getErrorMessage(failure));
    } finally {
      setBusyId(null);
    }
  }

  async function remove(question: QuestionRecord) {
    const preview =
      question.questionText.length > 80
        ? `${question.questionText.slice(0, 80)}…`
        : question.questionText;
    if (
      !window.confirm(
        `Delete this question permanently?\n\n"${preview}"\n\nThis cannot be undone. If it is used in an exam, archive it instead.`,
      )
    ) {
      return;
    }
    setBusyId(question.id);
    setActionError(null);
    setMessage(null);
    try {
      await apiFetch(`/api/admin/questions/${question.id}?permanent=true`, {
        method: "DELETE",
      });
      setMessage("Question deleted.");
      await reload();
      await onRefresh();
    } catch (failure) {
      setActionError(getErrorMessage(failure));
    } finally {
      setBusyId(null);
    }
  }

  const optionsValid =
    questionText.trim().length >= 10 &&
    (questionType === "SUBJECTIVE"
      ? true
      : options.length >= 2 &&
        options.every((option) => option.text.trim().length > 0) &&
        options.some((option) => option.key === correctOption));

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <Button
          onClick={() => {
            if (showCreate) {
              resetQuestionForm();
              setShowCreate(false);
            } else {
              resetQuestionForm();
              setShowCreate(true);
            }
          }}
        >
          {showCreate ? "Close editor" : "New question"}
        </Button>
        <Button variant="secondary" onClick={() => setShowGenerate((value) => !value)}>
          {showGenerate ? "Close AI generator" : "Generate with AI"}
        </Button>
      </div>

      {message ? <Alert tone="success">{message}</Alert> : null}
      {actionError ? <Alert tone="error">{actionError}</Alert> : null}

      {generationJob ? (
        <div className="rounded-lg border border-indigo-200 bg-indigo-50 px-3 py-2.5">
          <div className="flex items-center justify-between gap-3 text-xs font-medium text-indigo-800">
            <span className="truncate">
              {generationJob.progressMessage ?? "Generating questions..."}
            </span>
            <span className="tabular-nums">
              {Math.max(0, Math.min(100, generationJob.progress))}%
            </span>
          </div>
          <div className="mt-2">
            <ProgressBar value={generationJob.progress} />
          </div>
        </div>
      ) : null}

      {showCreate ? (
        <Card>
          <CardHeader
            title={editingId ? "Edit question" : "New question"}
            description={
              editingId
                ? "Saving an approved question returns it to the review queue."
                : "Questions must be approved before they can be used in a published exam."
            }
          />
          <form onSubmit={createQuestion} className="space-y-4 p-5">
            <Field label="Question" htmlFor="question-text">
              <Textarea
                id="question-text"
                value={questionText}
                onChange={(event) => setQuestionText(event.target.value)}
                rows={3}
                maxLength={4000}
                required
                placeholder="Write the question prompt…"
              />
            </Field>

            {questionType === "MCQ" ? (
              <div className="space-y-2">
              <p className="text-xs font-medium text-slate-700">Options</p>
              {options.map((option, index) => (
                <div key={option.key} className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setCorrectOption(option.key)}
                    aria-label={`Mark option ${option.key} correct`}
                    className={cn(
                      "flex h-8 w-8 shrink-0 items-center justify-center rounded-full border text-xs font-semibold",
                      correctOption === option.key
                        ? "border-emerald-500 bg-emerald-600 text-white"
                        : "border-slate-300 text-slate-500 hover:bg-slate-50",
                    )}
                  >
                    {option.key}
                  </button>
                  <Input
                    value={option.text}
                    onChange={(event) => setOptionText(index, event.target.value)}
                    placeholder={`Option ${option.key}`}
                    maxLength={1000}
                    required
                  />
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => removeOption(index)}
                    disabled={options.length <= 2}
                  >
                    Remove
                  </Button>
                </div>
              ))}
              <div className="flex items-center justify-between">
                <Button
                  size="sm"
                  variant="secondary"
                  onClick={addOption}
                  disabled={options.length >= LETTERS.length}
                >
                  Add option
                </Button>
                <p className="text-xs text-slate-500">
                  Correct answer: <span className="font-semibold">{correctOption}</span>
                </p>
              </div>
              </div>
            ) : (
              <p className="rounded-lg bg-slate-50 px-3 py-2 text-xs text-slate-500">
                Subjective questions have no options. The model answer is stored in the explanation.
              </p>
            )}

            <Field
              label={questionType === "SUBJECTIVE" ? "Model answer" : "Explanation"}
              htmlFor="question-explanation"
              hint="Shown during answer review."
            >
              <Textarea
                id="question-explanation"
                value={explanation}
                onChange={(event) => setExplanation(event.target.value)}
                rows={2}
                maxLength={6000}
              />
            </Field>

            <div className="grid gap-3 sm:grid-cols-3">
              <Field label="Difficulty" htmlFor="question-difficulty">
                <Select
                  id="question-difficulty"
                  value={difficulty}
                  onChange={(event) => setDifficulty(event.target.value as Difficulty)}
                >
                  <option value="EASY">Easy</option>
                  <option value="MEDIUM">Medium</option>
                  <option value="HARD">Hard</option>
                </Select>
              </Field>
              <Field label="Topic" htmlFor="question-topic">
                <Select
                  id="question-topic"
                  value={questionTopicId}
                  onChange={(event) => setQuestionTopicId(event.target.value)}
                >
                  <option value="">No topic</option>
                  {subject.topics.map((topic) => (
                    <option key={topic.id} value={topic.id}>
                      {topic.name}
                    </option>
                  ))}
                </Select>
              </Field>
              {editingId ? null : (
                <Field label="Initial status" htmlFor="question-status">
                  <Select
                    id="question-status"
                    value={initialStatus}
                    onChange={(event) =>
                      setInitialStatus(event.target.value as "DRAFT" | "PENDING_REVIEW")
                    }
                  >
                    <option value="PENDING_REVIEW">Submit for review</option>
                    <option value="DRAFT">Save as draft</option>
                  </Select>
                </Field>
              )}
            </div>

            <div className="flex justify-end gap-2">
              <Button type="button" variant="secondary" onClick={resetQuestionForm}>
                Reset
              </Button>
              <Button type="submit" loading={creating} disabled={!optionsValid}>
                {editingId ? "Save changes" : "Create question"}
              </Button>
            </div>
          </form>
        </Card>
      ) : null}

      {showGenerate ? (
        <Card>
          <CardHeader
            title="Generate questions with AI"
            description="Drafts are created from processed study material and land in the review queue."
          />
          <form onSubmit={generateQuestions} className="space-y-4 p-5">
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="Topic" htmlFor="gen-topic">
                <Select
                  id="gen-topic"
                  value={genTopicId}
                  onChange={(event) => setGenTopicId(event.target.value)}
                >
                  <option value="">Whole subject</option>
                  {subject.topics.map((topic) => (
                    <option key={topic.id} value={topic.id}>
                      {topic.name}
                    </option>
                  ))}
                </Select>
              </Field>
              <Field label="Number of questions" htmlFor="gen-count" hint="Between 1 and 5 per request.">
                <Input
                  id="gen-count"
                  type="number"
                  min={1}
                  max={5}
                  value={genCount}
                  onChange={(event) => setGenCount(event.target.value)}
                />
              </Field>
              <Field label="Difficulty" htmlFor="gen-difficulty">
                <Select
                  id="gen-difficulty"
                  value={genDifficulty}
                  onChange={(event) => setGenDifficulty(event.target.value as Difficulty)}
                >
                  <option value="EASY">Easy</option>
                  <option value="MEDIUM">Medium</option>
                  <option value="HARD">Hard</option>
                </Select>
              </Field>
            </div>
            <Field
              label="Extra instructions"
              htmlFor="gen-instructions"
              hint="Optional. E.g. focus on numerical problems."
            >
              <Textarea
                id="gen-instructions"
                value={genInstructions}
                onChange={(event) => setGenInstructions(event.target.value)}
                rows={2}
                maxLength={500}
              />
            </Field>
            <div className="flex justify-end">
              <Button type="submit" loading={generating}>
                Queue generation
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
              placeholder="Search question text…"
              aria-label="Search questions"
            />
            <Button type="submit" variant="secondary">
              Search
            </Button>
          </form>
          <Select
            value={status}
            onChange={(event) => {
              setStatus(event.target.value);
              setPage(1);
            }}
            aria-label="Filter by status"
            className="lg:w-44"
          >
            {STATUS_FILTERS.map((value) => (
              <option key={value || "all"} value={value}>
                {value === ""
                  ? "All statuses"
                  : value
                      .toLowerCase()
                      .split("_")
                      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
                      .join(" ")}
              </option>
            ))}
          </Select>
          <Select
            value={topicId}
            onChange={(event) => {
              setTopicId(event.target.value);
              setPage(1);
            }}
            aria-label="Filter by topic"
            className="lg:w-44"
          >
            <option value="">All topics</option>
            {subject.topics.map((topic) => (
              <option key={topic.id} value={topic.id}>
                {topic.name}
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
            <Spinner /> Loading questions…
          </div>
        ) : null}

        {data && data.items.length === 0 ? (
          <EmptyState
            title="No questions found"
            description="Add questions manually or generate drafts with AI."
          />
        ) : null}

        {data && data.items.length > 0 ? (
          <>
            <ul className="divide-y divide-slate-100">
              {data.items.map((question) => (
                <li key={question.id} className="px-5 py-4">
                  <div className="flex flex-col gap-2 lg:flex-row lg:items-start lg:justify-between">
                    <div className="min-w-0 flex-1">
                      <p className="text-sm leading-6 text-slate-900">{question.questionText}</p>
                      <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
                        <StatusBadge status={question.status} />
                        <Badge tone="slate">
                          {question.type === "SUBJECTIVE" ? "Subjective" : "MCQ"}
                        </Badge>
                        <Badge tone="slate">{question.difficulty}</Badge>
                        <Badge tone="slate">{question.source}</Badge>
                        {question.topic ? (
                          <Badge tone="indigo">{question.topic.name}</Badge>
                        ) : null}
                        <span className="text-[11px] text-slate-400">
                          created {formatDateTime(question.createdAt)} · used in{" "}
                          {question.examUsageCount} exams
                        </span>
                      </div>
                      <details className="mt-2 text-xs text-slate-600">
                        <summary className="cursor-pointer text-slate-500">
                          {(question.options ?? []).length > 0 ? "View options & answer" : "View model answer"}
                        </summary>
                        {(question.options ?? []).length > 0 ? (
                          <ul className="mt-2 space-y-1">
                            {(question.options ?? []).map((option) => (
                              <li
                                key={option.key}
                                className={cn(
                                  "rounded px-2 py-1",
                                  option.key === question.correctOption
                                    ? "bg-emerald-50 text-emerald-800"
                                    : "bg-slate-50",
                                )}
                              >
                                <span className="font-semibold">{option.key}.</span> {option.text}
                                {option.key === question.correctOption ? " ✓" : ""}
                              </li>
                            ))}
                          </ul>
                        ) : null}
                        {question.explanation ? (
                          <div className="mt-2 rounded bg-slate-50 px-3 py-2 text-sm">
                            <FormattedText text={question.explanation} />
                          </div>
                        ) : null}
                      </details>
                    </div>
                    <div className="flex shrink-0 flex-wrap items-center gap-1">
                      {question.status !== "ARCHIVED" ? (
                        <Button
                          size="sm"
                          variant="secondary"
                          onClick={() => startEdit(question)}
                          disabled={busyId === question.id}
                        >
                          Edit
                        </Button>
                      ) : null}
                      {question.status !== "APPROVED" && question.status !== "ARCHIVED" ? (
                        <Button
                          size="sm"
                          onClick={() => void review(question, "approve")}
                          loading={busyId === question.id}
                        >
                          Approve
                        </Button>
                      ) : null}
                      {question.status !== "REJECTED" && question.status !== "ARCHIVED" ? (
                        <Button
                          size="sm"
                          variant="secondary"
                          onClick={() => void review(question, "reject")}
                          disabled={busyId === question.id}
                        >
                          Reject
                        </Button>
                      ) : null}
                      {question.status !== "ARCHIVED" ? (
                        <Button
                          size="sm"
                          variant="ghost"
                          className="text-rose-600 hover:bg-rose-50 hover:text-rose-700"
                          onClick={() => void archive(question)}
                          disabled={busyId === question.id}
                        >
                          Archive
                        </Button>
                      ) : null}
                      <Button
                        size="sm"
                        variant="ghost"
                        className="text-rose-600 hover:bg-rose-50 hover:text-rose-700"
                        onClick={() => void remove(question)}
                        disabled={busyId === question.id}
                      >
                        Delete
                      </Button>
                    </div>
                  </div>
                </li>
              ))}
            </ul>

            <div className="flex flex-col gap-2 border-t border-slate-100 px-5 py-3 text-xs text-slate-500 sm:flex-row sm:items-center sm:justify-between">
              <span>
                Page {data.pagination.page} of {data.pagination.totalPages} ·{" "}
                {data.pagination.total} questions
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
