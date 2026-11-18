"use client";

import { useState } from "react";
import { useApiData } from "@/lib/use-api";
import type { QuestionBankResponse } from "@/types/api";
import {
  Alert,
  Badge,
  Button,
  Card,
  EmptyState,
  Field,
  PageHeader,
  Select,
  Skeleton,
  cn,
} from "@/components/ui";
import { FormattedText } from "@/components/formatted-text";

export default function QuestionBankPage() {
  const [subjectId, setSubjectId] = useState("");
  const [topicId, setTopicId] = useState("");
  const [page, setPage] = useState(1);
  const [answerFontSize, setAnswerFontSize] = useState<"sm" | "md" | "lg">("md");

  const query = new URLSearchParams({ page: String(page), pageSize: "10" });
  if (subjectId) query.set("subjectId", subjectId);
  if (topicId) query.set("topicId", topicId);

  const { data, error, loading, reload } = useApiData<QuestionBankResponse>(
    `/api/question-bank?${query.toString()}`,
  );

  const subjects = data?.subjects ?? [];
  const selectedSubject = subjects.find((subject) => subject.id === subjectId);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Question bank"
        description="Browse questions approved by your admin. Filter by subject and topic, then reveal the correct answer or model answer."
      />

      <Card>
        <div className="grid gap-3 border-b border-slate-100 p-4 sm:grid-cols-2">
          <Field label="Subject" htmlFor="question-bank-subject">
            <Select
              id="question-bank-subject"
              value={subjectId}
              onChange={(event) => {
                setSubjectId(event.target.value);
                setTopicId("");
                setPage(1);
              }}
            >
              <option value="">All subjects</option>
              {subjects.map((subject) => (
                <option key={subject.id} value={subject.id}>
                  {subject.name}
                </option>
              ))}
            </Select>
          </Field>
          <Field
            label="Topic"
            htmlFor="question-bank-topic"
            hint={subjectId ? undefined : "Choose a subject to filter by topic."}
          >
            <Select
              id="question-bank-topic"
              value={topicId}
              onChange={(event) => {
                setTopicId(event.target.value);
                setPage(1);
              }}
              disabled={!subjectId}
            >
              <option value="">All topics</option>
              {(selectedSubject?.topics ?? []).map((topic) => (
                <option key={topic.id} value={topic.id}>
                  {topic.name}
                </option>
              ))}
            </Select>
          </Field>
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
          <div aria-busy="true" className="space-y-4 p-5">
            {Array.from({ length: 4 }, (_, index) => (
              <div key={index} className="space-y-3">
                <Skeleton className="h-5 w-3/4" />
                <Skeleton className="h-4 w-1/2" />
                <Skeleton className="h-24 w-full" />
              </div>
            ))}
          </div>
        ) : null}

        {data && data.subjects.length === 0 ? (
          <EmptyState
            title="No active subjects"
            description="You are not enrolled in an active subject yet. Contact your administrator."
          />
        ) : null}

        {data && data.subjects.length > 0 && data.items.length === 0 ? (
          <EmptyState
            title="No approved questions found"
            description={
              subjectId
                ? "No approved questions match this subject and topic yet. Try another topic or check back later."
                : "Questions will appear here after an administrator approves them."
            }
          />
        ) : null}

        {data && data.items.length > 0 ? (
          <>
            <ul className="divide-y divide-slate-100">
              {data.items.map((question) => (
                <li key={question.id} className="px-5 py-4">
                  <p className="text-sm leading-6 text-slate-900">{question.questionText}</p>
                  <div className="mt-2 flex flex-wrap items-center gap-1.5">
                    <Badge tone="green">Approved</Badge>
                    <Badge tone="indigo">{question.subject.name}</Badge>
                    {question.topic ? <Badge tone="violet">{question.topic.name}</Badge> : null}
                    <Badge tone="slate">
                      {question.type === "SUBJECTIVE" ? "Subjective" : "MCQ"}
                    </Badge>
                    <Badge tone="slate">{question.difficulty}</Badge>
                  </div>

                  <details className="mt-3 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2">
                    <summary className="cursor-pointer text-xs font-medium text-slate-600">
                      {question.type === "MCQ" ? "View options and correct answer" : "View model answer"}
                    </summary>

                    <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
                      <span className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">
                        Font size
                      </span>
                      <div className="flex items-center gap-1">
                        {(["sm", "md", "lg"] as const).map((size) => (
                          <button
                            key={size}
                            type="button"
                            onClick={() => setAnswerFontSize(size)}
                            className={cn(
                              "rounded-md px-2 py-1 text-xs font-medium ring-1 ring-inset transition",
                              answerFontSize === size
                                ? "bg-indigo-600 text-white ring-indigo-600"
                                : "bg-white text-slate-600 ring-slate-200 hover:bg-slate-100",
                            )}
                          >
                            {size === "sm" ? "Small" : size === "md" ? "Medium" : "Large"}
                          </button>
                        ))}
                      </div>
                    </div>

                    {question.type === "MCQ" && question.options.length > 0 ? (
                      <ul className="mt-3 space-y-1.5">
                        {question.options.map((option) => (
                          <li
                            key={option.key}
                            className={cn(
                              "rounded-lg px-3 py-2 text-sm",
                              option.key === question.correctOption
                                ? "bg-emerald-100 text-emerald-900 ring-1 ring-inset ring-emerald-300"
                                : "bg-white text-slate-700 ring-1 ring-inset ring-slate-200",
                            )}
                          >
                            <span className="font-semibold">{option.key}.</span> {option.text}
                            {option.key === question.correctOption ? (
                              <span className="ml-2 text-xs font-semibold uppercase tracking-wide text-emerald-700">
                                Correct answer
                              </span>
                            ) : null}
                          </li>
                        ))}
                      </ul>
                    ) : null}

                    {question.explanation ? (
                      <div className="mt-3 rounded-lg bg-white px-4 py-3 ring-1 ring-inset ring-slate-200 shadow-sm">
                        <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">
                          {question.type === "MCQ" ? "Explanation" : "Model answer"}
                        </p>
                        <div
                          className={cn(
                            "mt-2",
                            answerFontSize === "sm"
                              ? "text-sm"
                              : answerFontSize === "lg"
                                ? "text-lg"
                                : "text-base",
                          )}
                        >
                          <FormattedText text={question.explanation} />
                        </div>
                      </div>
                    ) : null}
                  </details>
                </li>
              ))}
            </ul>

            <div className="flex flex-col gap-2 border-t border-slate-100 px-5 py-3 text-xs text-slate-500 sm:flex-row sm:items-center sm:justify-between">
              <span>
                Page {data.pagination.page} of {data.pagination.totalPages} ·{" "}
                {data.pagination.total} approved question
                {data.pagination.total === 1 ? "" : "s"}
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