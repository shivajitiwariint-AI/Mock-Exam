"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { apiFetch, getErrorMessage } from "@/lib/client-api";
import { useApiData } from "@/lib/use-api";
import { formatDate, formatDateTime } from "@/lib/format";
import type { InterviewPrep } from "@/types/api";
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
  Spinner,
  StatusBadge,
  Textarea,
} from "@/components/ui";

export default function InterviewsPage() {
  const router = useRouter();
  const { data, error, loading, reload } = useApiData<InterviewPrep[]>("/api/interviews");

  const [title, setTitle] = useState("");
  const [company, setCompany] = useState("");
  const [role, setRole] = useState("");
  const [jdText, setJdText] = useState("");
  const [interviewDate, setInterviewDate] = useState("");
  const [actualQuestionsText, setActualQuestionsText] = useState("");
  const [actualQuestionsName, setActualQuestionsName] = useState("");
  const [resumeName, setResumeName] = useState("");
  const [jdName, setJdName] = useState("");
  const [uploading, setUploading] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editInterviewDate, setEditInterviewDate] = useState("");
  const [editActualText, setEditActualText] = useState("");
  const [editActualName, setEditActualName] = useState("");
  const resumeRef = useRef<HTMLInputElement | null>(null);
  const jdRef = useRef<HTMLInputElement | null>(null);
  const actualQuestionsRef = useRef<HTMLInputElement | null>(null);
  const editActualRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (!data) return;
    const pending = data.some((prep) => prep.status === "PROCESSING");
    if (!pending) return;
    const timer = window.setInterval(() => void reload(), 5000);
    return () => window.clearInterval(timer);
  }, [data, reload]);

  async function createKit() {
    setActionError(null);
    setMessage(null);

    const resume = resumeRef.current?.files?.[0];
    if (!resume) {
      setActionError("Choose a resume file (PDF, DOCX, or TXT).");
      return;
    }
    const jdFile = jdRef.current?.files?.[0];
    if (!jdFile && !jdText.trim()) {
      setActionError("Upload a job description or paste the JD text.");
      return;
    }

    const form = new FormData();
    form.set("resume", resume);
    if (jdFile) form.set("jdFile", jdFile);
    if (jdText.trim()) form.set("jdText", jdText);
    const actualQuestionsFile = actualQuestionsRef.current?.files?.[0];
    form.set("title", title);
    form.set("company", company);
    form.set("role", role);
    if (interviewDate) form.set("interviewDate", interviewDate);
    if (actualQuestionsText.trim()) form.set("actualQuestionsText", actualQuestionsText);
    if (actualQuestionsFile) form.set("actualQuestionsFile", actualQuestionsFile);

    setUploading(true);
    try {
      await apiFetch<{ prep: InterviewPrep }>("/api/interviews", {
        method: "POST",
        body: form,
      });
      setMessage(
        "Uploaded. AI is building a comprehensive question bank; each mock interview asks 30 random questions.",
      );
      setTitle("");
      setCompany("");
      setRole("");
      setJdText("");
      setInterviewDate("");
      setActualQuestionsText("");
      setActualQuestionsName("");
      setResumeName("");
      setJdName("");
      if (resumeRef.current) resumeRef.current.value = "";
      if (jdRef.current) jdRef.current.value = "";
      if (actualQuestionsRef.current) actualQuestionsRef.current.value = "";
      await reload();
    } catch (failure) {
      setActionError(getErrorMessage(failure));
    } finally {
      setUploading(false);
    }
  }

  async function startInterview(prep: InterviewPrep) {
    setBusyId(prep.id);
    setActionError(null);
    setMessage(null);
    try {
      const session = await apiFetch<{ sessionId: string }>(
        `/api/interviews/${prep.id}/sessions`,
        { method: "POST" },
      );
      router.push(`/interviews/sessions/${session.sessionId}`);
    } catch (failure) {
      setActionError(getErrorMessage(failure));
      setBusyId(null);
    }
  }

  function beginActualEdit(prep: InterviewPrep) {
    if (editingId === prep.id) {
      setEditingId(null);
      return;
    }
    setEditingId(prep.id);
    setEditInterviewDate(prep.interviewDate ? prep.interviewDate.slice(0, 10) : "");
    setEditActualText("");
    setEditActualName("");
    if (editActualRef.current) editActualRef.current.value = "";
    setActionError(null);
    setMessage(null);
  }

  async function saveActualDetails(prep: InterviewPrep) {
    const file = editActualRef.current?.files?.[0];
    if (!editInterviewDate && !editActualText.trim() && !file) {
      setActionError("Add an interview date, paste the questions, or upload a questions file.");
      return;
    }

    const form = new FormData();
    form.set("interviewDate", editInterviewDate);
    if (editActualText.trim()) form.set("actualQuestionsText", editActualText);
    if (file) form.set("actualQuestionsFile", file);

    setBusyId(prep.id);
    setActionError(null);
    setMessage(null);
    try {
      await apiFetch(`/api/interviews/${prep.id}`, { method: "PATCH", body: form });
      setMessage(
        "Real interview details saved. Regenerate the bank to apply them to new AI questions.",
      );
      setEditingId(null);
      await reload();
    } catch (failure) {
      setActionError(getErrorMessage(failure));
    } finally {
      setBusyId(null);
    }
  }

  async function retryGeneration(prep: InterviewPrep) {
    setBusyId(prep.id);
    setActionError(null);
    setMessage(null);
    try {
      await apiFetch(`/api/interviews/${prep.id}/generate`, { method: "POST" });
      setMessage(`Regenerating questions for "${prep.title}".`);
      await reload();
    } catch (failure) {
      setActionError(getErrorMessage(failure));
    } finally {
      setBusyId(null);
    }
  }

  async function removePrep(prep: InterviewPrep) {
    if (!window.confirm(`Delete "${prep.title}" and all of its practice sessions?`)) return;
    setBusyId(prep.id);
    setActionError(null);
    setMessage(null);
    try {
      await apiFetch(`/api/interviews/${prep.id}`, { method: "DELETE" });
      setMessage("Interview kit deleted.");
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
        title="Interview prep"
        description="Upload your resume and a company job description. AI builds a comprehensive question bank, then each mock interview asks 30 random questions with per-answer and overall feedback."
      />

      <Card>
        <CardHeader
          title="Create an interview kit"
          description="PDF, DOCX, and TXT are supported. Files are stored privately; only extracted text is sent to the AI provider."
        />

        <div className="space-y-4 p-5">
          {message ? <Alert tone="success">{message}</Alert> : null}
          {actionError ? <Alert tone="error">{actionError}</Alert> : null}

          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Resume file" hint="Required. PDF, DOCX, or TXT.">
              <input
                ref={resumeRef}
                type="file"
                accept=".pdf,.docx,.txt"
                onChange={(event) => setResumeName(event.target.files?.[0]?.name ?? "")}
                className="block w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700 file:mr-3 file:rounded-md file:border-0 file:bg-slate-100 file:px-3 file:py-1.5 file:text-xs file:font-medium"
              />
              {resumeName ? (
                <p className="mt-1 text-xs text-slate-500">{resumeName}</p>
              ) : null}
            </Field>

            <Field label="Job description file" hint="Optional if you paste the JD text below.">
              <input
                ref={jdRef}
                type="file"
                accept=".pdf,.docx,.txt"
                onChange={(event) => setJdName(event.target.files?.[0]?.name ?? "")}
                className="block w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700 file:mr-3 file:rounded-md file:border-0 file:bg-slate-100 file:px-3 file:py-1.5 file:text-xs file:font-medium"
              />
              {jdName ? <p className="mt-1 text-xs text-slate-500">{jdName}</p> : null}
            </Field>

            <Field label="Kit title" hint="Defaults to company and role.">
              <Input
                value={title}
                onChange={(event) => setTitle(event.target.value)}
                placeholder="Backend engineer — Acme"
              />
            </Field>
            <Field label="Company">
              <Input
                value={company}
                onChange={(event) => setCompany(event.target.value)}
                placeholder="Acme Corp"
              />
            </Field>
            <Field label="Target role">
              <Input
                value={role}
                onChange={(event) => setRole(event.target.value)}
                placeholder="Senior Backend Engineer"
              />
            </Field>
            <Field
              label="Previous interview date"
              hint="Optional. Helps the AI calibrate the question bank."
            >
              <Input
                type="date"
                value={interviewDate}
                onChange={(event) => setInterviewDate(event.target.value)}
              />
            </Field>
            <Field
              label="Actual questions file"
              hint="Optional. PDF, DOCX, or TXT from your main interview."
            >
              <input
                ref={actualQuestionsRef}
                type="file"
                accept=".pdf,.docx,.txt"
                onChange={(event) =>
                  setActualQuestionsName(event.target.files?.[0]?.name ?? "")
                }
                className="block w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700 file:mr-3 file:rounded-md file:border-0 file:bg-slate-100 file:px-3 file:py-1.5 file:text-xs file:font-medium"
              />
              {actualQuestionsName ? (
                <p className="mt-1 text-xs text-slate-500">{actualQuestionsName}</p>
              ) : null}
            </Field>
          </div>

          <Field label="Paste job description" hint="Used when no JD file is selected.">
            <Textarea
              value={jdText}
              onChange={(event) => setJdText(event.target.value)}
              rows={6}
              placeholder="Paste the responsibilities, requirements, and tech stack from the company JD…"
            />
          </Field>

          <Field
            label="Actual questions from your main interview"
            hint="Optional. Paste the real questions you were asked so the AI can improve future generations."
          >
            <Textarea
              value={actualQuestionsText}
              onChange={(event) => setActualQuestionsText(event.target.value)}
              rows={4}
              placeholder="e.g. Design a rate limiter. Tell me about a production incident you owned…"
            />
          </Field>

          <div className="flex items-center justify-between gap-3">
            <p className="text-xs text-slate-500">
              AI builds a comprehensive bank; each mock interview randomly asks 30 questions. Rate
              limited to 10 new kits per hour.
            </p>
            <Button onClick={() => void createKit()} loading={uploading}>
              Create interview kit
            </Button>
          </div>
        </div>
      </Card>

      {error ? (
        <Alert tone="error">
          {error}{" "}
          <button className="underline" onClick={() => void reload()}>
            Retry
          </button>
        </Alert>
      ) : null}

      {loading && !data ? (
        <Card className="flex items-center justify-center gap-2 py-16 text-sm text-slate-500">
          <Spinner /> Loading interview kits…
        </Card>
      ) : null}

      {data && data.length === 0 ? (
        <Card>
          <EmptyState
            title="No interview kits yet"
            description="Upload your resume and a job description to generate a personalised practice interview."
          />
        </Card>
      ) : null}

      <div className="grid gap-4">
        {(data ?? []).map((prep) => {
          const latestSession = prep.sessions[0];
          return (
            <Card key={prep.id} className="p-5">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                <div className="min-w-0 space-y-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <h2 className="text-base font-semibold text-slate-900">{prep.title}</h2>
                    <StatusBadge status={prep.status} />
                    <Badge tone="violet">{prep.questionCount} questions</Badge>
                    {prep.sessionCount > 0 ? (
                      <Badge tone="slate">
                        {prep.sessionCount} session{prep.sessionCount === 1 ? "" : "s"}
                      </Badge>
                    ) : null}
                  </div>
                  <p className="text-xs text-slate-500">
                    {prep.company ? `${prep.company} · ` : ""}
                    {prep.role ? `${prep.role} · ` : ""}
                    created {formatDateTime(prep.createdAt)}
                  </p>
                  <p className="text-xs text-slate-500">
                    Resume: {prep.resumeFilename ?? "—"}
                    {prep.jdFilename ? ` · JD: ${prep.jdFilename}` : " · JD pasted as text"}
                  </p>
                  {prep.interviewDate || prep.hasActualQuestions ? (
                    <p className="flex flex-wrap items-center gap-2 text-xs text-slate-500">
                      {prep.interviewDate
                        ? `Main interview: ${formatDate(prep.interviewDate)}`
                        : null}
                      {prep.hasActualQuestions ? (
                        <Badge tone="green">Real questions added</Badge>
                      ) : null}
                      {prep.actualQuestionsFilename ? (
                        <span>· {prep.actualQuestionsFilename}</span>
                      ) : null}
                    </p>
                  ) : null}
                  {prep.status === "PROCESSING" ? (
                    <p className="flex items-center gap-2 text-xs text-sky-700">
                      <Spinner className="h-3 w-3" /> AI is drafting questions from your resume and
                      the JD…
                    </p>
                  ) : null}
                  {prep.status === "FAILED" ? (
                    <p className="text-xs text-rose-600">
                      {prep.errorMessage ?? "Question generation failed."}
                    </p>
                  ) : null}
                  {latestSession ? (
                    <p className="text-xs text-slate-600">
                      Latest session:{" "}
                      <Link
                        href={`/interviews/sessions/${latestSession.id}`}
                        className="font-medium text-indigo-600 hover:text-indigo-500"
                      >
                        {latestSession.status === "COMPLETED"
                          ? `completed · ${latestSession.overallScore ?? "—"}/100`
                          : "in progress"}
                      </Link>
                    </p>
                  ) : null}
                </div>

                <div className="flex shrink-0 flex-wrap items-center gap-1.5">
                  <Button
                    size="sm"
                    onClick={() => void startInterview(prep)}
                    disabled={prep.status !== "READY" || busyId === prep.id}
                    loading={busyId === prep.id}
                  >
                    Start mock interview
                  </Button>
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={() => beginActualEdit(prep)}
                    disabled={busyId === prep.id}
                  >
                    {editingId === prep.id
                      ? "Close details"
                      : prep.interviewDate || prep.hasActualQuestions
                        ? "Edit real interview"
                        : "Add real interview"}
                  </Button>
                  {prep.status !== "PROCESSING" && prep.sessionCount === 0 ? (
                    <Button
                      size="sm"
                      variant="secondary"
                      onClick={() => void retryGeneration(prep)}
                      disabled={busyId === prep.id}
                    >
                      {prep.status === "FAILED" ? "Retry AI" : "Regenerate"}
                    </Button>
                  ) : null}
                  <Button
                    size="sm"
                    variant="ghost"
                    className="text-rose-600 hover:bg-rose-50 hover:text-rose-700"
                    onClick={() => void removePrep(prep)}
                    disabled={busyId === prep.id}
                  >
                    Delete
                  </Button>
                </div>
              </div>

              {editingId === prep.id ? (
                <div className="mt-4 space-y-3 rounded-lg border border-emerald-200 bg-emerald-50/40 p-3">
                  <p className="text-xs font-semibold text-emerald-900">
                    Real interview details
                  </p>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <Field label="Main interview date">
                      <Input
                        type="date"
                        value={editInterviewDate}
                        onChange={(event) => setEditInterviewDate(event.target.value)}
                      />
                    </Field>
                    <Field
                      label="Actual questions file"
                      hint="Optional. Replaces the previously uploaded file."
                    >
                      <input
                        ref={editActualRef}
                        type="file"
                        accept=".pdf,.docx,.txt"
                        onChange={(event) =>
                          setEditActualName(event.target.files?.[0]?.name ?? "")
                        }
                        className="block w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700 file:mr-3 file:rounded-md file:border-0 file:bg-slate-100 file:px-3 file:py-1.5 file:text-xs file:font-medium"
                      />
                      {editActualName ? (
                        <p className="mt-1 text-xs text-slate-500">{editActualName}</p>
                      ) : null}
                    </Field>
                  </div>
                  <Field
                    label="Actual questions asked"
                    hint="Leave blank to keep the existing questions. New text replaces the stored text."
                  >
                    <Textarea
                      value={editActualText}
                      onChange={(event) => setEditActualText(event.target.value)}
                      rows={4}
                      placeholder="Paste the real questions from your main interview…"
                    />
                  </Field>
                  <div className="flex items-center justify-end gap-2">
                    <Button
                      size="sm"
                      variant="secondary"
                      onClick={() => setEditingId(null)}
                      disabled={busyId === prep.id}
                    >
                      Cancel
                    </Button>
                    <Button
                      size="sm"
                      onClick={() => void saveActualDetails(prep)}
                      loading={busyId === prep.id}
                    >
                      Save details
                    </Button>
                  </div>
                </div>
              ) : null}
            </Card>
          );
        })}
      </div>
    </div>
  );
}
