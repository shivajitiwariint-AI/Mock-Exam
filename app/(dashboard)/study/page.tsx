"use client";

import { useEffect, useRef, useState } from "react";
import { apiFetch, getErrorMessage } from "@/lib/client-api";
import { useApiData } from "@/lib/use-api";
import type { SessionUser, StudyAnswer, SubjectOption } from "@/types/api";
import {
  Alert,
  Badge,
  Button,
  Card,
  CardHeader,
  EmptyState,
  PageHeader,
  Spinner,
  Textarea,
} from "@/components/ui";

type MeResponse = {
  user: SessionUser & { status: string };
  subjects: SubjectOption[];
};

type Exchange = {
  id: string;
  question: string;
  answer?: StudyAnswer;
  error?: string;
  pending: boolean;
};

const SUGGESTIONS = [
  "Summarize the key concepts covered in this subject.",
  "Explain the difference between the two most important definitions.",
  "Give me a short practice example and walk through the solution.",
  "What are the common mistakes students make on this topic?",
];

export default function StudyPage() {
  const { data: me, error: meError, loading: meLoading } = useApiData<MeResponse>("/api/me");
  const [subjectId, setSubjectId] = useState("");
  const [question, setQuestion] = useState("");
  const [exchanges, setExchanges] = useState<Exchange[]>([]);
  const [asking, setAsking] = useState(false);
  const endRef = useRef<HTMLDivElement | null>(null);

  const subjects = (me?.subjects ?? []).filter((subject) => subject.status === "ACTIVE");

  useEffect(() => {
    if (!subjectId && subjects.length > 0) {
      setSubjectId(String(subjects[0].id));
    }
  }, [subjectId, subjects]);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [exchanges.length]);

  async function ask(value?: string) {
    const text = (value ?? question).trim();
    if (!text || !subjectId || asking) return;

    const id = `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    setExchanges((previous) => [...previous, { id, question: text, pending: true }]);
    setQuestion("");
    setAsking(true);

    try {
      const answer = await apiFetch<StudyAnswer>("/api/study/query", {
        method: "POST",
        body: JSON.stringify({ subjectId, question: text }),
      });
      setExchanges((previous) =>
        previous.map((exchange) =>
          exchange.id === id ? { ...exchange, answer, pending: false } : exchange,
        ),
      );
    } catch (failure) {
      setExchanges((previous) =>
        previous.map((exchange) =>
          exchange.id === id
            ? { ...exchange, error: getErrorMessage(failure), pending: false }
            : exchange,
        ),
      );
    } finally {
      setAsking(false);
    }
  }

  if (meLoading && !me) {
    return (
      <Card className="flex items-center justify-center gap-2 py-16 text-sm text-slate-500">
        <Spinner /> Loading study assistant…
      </Card>
    );
  }

  if (meError) {
    return <Alert tone="error">{meError}</Alert>;
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Study assistant"
        description="Answers are grounded in the study material uploaded for your subject, with citations. The assistant will not guess beyond the sources."
      />

      {subjects.length === 0 ? (
        <Card>
          <EmptyState
            title="No active subjects"
            description="You are not enrolled in an active subject yet. Contact your administrator."
          />
        </Card>
      ) : (
        <>
          <Card>
            <div className="flex flex-col gap-3 p-5 sm:flex-row sm:items-end">
              <label className="flex-1 text-sm">
                <span className="mb-1 block text-xs font-medium text-slate-600">Subject</span>
                <select
                  value={subjectId}
                  onChange={(event) => {
                    setSubjectId(event.target.value);
                    setExchanges([]);
                  }}
                  className="h-10 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm shadow-sm outline-none transition focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100"
                >
                  {subjects.map((subject) => (
                    <option key={subject.id} value={subject.id}>
                      {subject.name}
                    </option>
                  ))}
                </select>
              </label>
              <div className="text-xs text-slate-400 sm:pb-3">
                Rate limited to 30 questions per hour.
              </div>
            </div>
          </Card>

          <Card>
            <CardHeader
              title="Ask a question"
              description="Be specific. The assistant retrieves the most relevant passages before answering."
            />

            {exchanges.length === 0 ? (
              <div className="px-5 pb-2">
                <div className="flex flex-wrap gap-2">
                  {SUGGESTIONS.map((suggestion) => (
                    <button
                      key={suggestion}
                      type="button"
                      onClick={() => void ask(suggestion)}
                      className="rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs text-slate-600 transition-colors hover:border-indigo-300 hover:text-indigo-700"
                    >
                      {suggestion}
                    </button>
                  ))}
                </div>
              </div>
            ) : null}

            <div className="space-y-5 px-5 py-4">
              {exchanges.map((exchange) => (
                <div key={exchange.id} className="space-y-3">
                  <div className="flex justify-end">
                    <p className="max-w-[85%] whitespace-pre-wrap rounded-2xl rounded-br-sm bg-indigo-600 px-4 py-2.5 text-sm text-white">
                      {exchange.question}
                    </p>
                  </div>

                  <div className="max-w-[92%] rounded-2xl rounded-bl-sm border border-slate-200 bg-slate-50 px-4 py-3">
                    {exchange.pending ? (
                      <span className="flex items-center gap-2 text-sm text-slate-500">
                        <Spinner /> Searching study material…
                      </span>
                    ) : exchange.error ? (
                      <p className="text-sm text-rose-700">{exchange.error}</p>
                    ) : exchange.answer ? (
                      <>
                        <p className="whitespace-pre-wrap text-sm leading-6 text-slate-800">
                          {exchange.answer.answer}
                        </p>
                        {exchange.answer.sources.length > 0 ? (
                          <div className="mt-3 border-t border-slate-200 pt-3">
                            <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">
                              Sources
                            </p>
                            <ol className="mt-2 space-y-2">
                              {exchange.answer.sources.map((source, index) => (
                                <li key={`${source.documentId}-${source.chunkIndex}`} className="text-xs">
                                  <div className="flex flex-wrap items-center gap-2">
                                    <Badge tone="slate">S{index + 1}</Badge>
                                    <span className="font-medium text-slate-700">
                                      {source.filename}
                                    </span>
                                    <span className="text-slate-400">
                                      chunk {source.chunkIndex} · score {source.score}
                                    </span>
                                  </div>
                                  <p className="mt-1 line-clamp-2 text-slate-500">{source.snippet}</p>
                                </li>
                              ))}
                            </ol>
                          </div>
                        ) : null}
                      </>
                    ) : null}
                  </div>
                </div>
              ))}
              <div ref={endRef} />
            </div>

            <div className="border-t border-slate-100 p-5">
              <Textarea
                value={question}
                onChange={(event) => setQuestion(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter" && (event.metaKey || event.ctrlKey)) {
                    event.preventDefault();
                    void ask();
                  }
                }}
                rows={3}
                placeholder="Ask about a concept in the study material…"
              />
              <div className="mt-3 flex items-center justify-between gap-3">
                <span className="text-xs text-slate-400">Ctrl/⌘ + Enter to send</span>
                <Button onClick={() => void ask()} loading={asking} disabled={!question.trim()}>
                  Ask
                </Button>
              </div>
            </div>
          </Card>
        </>
      )}
    </div>
  );
}
