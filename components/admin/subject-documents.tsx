"use client";

import { useEffect, useRef, useState } from "react";
import { apiFetch, apiUpload, getErrorMessage } from "@/lib/client-api";
import { useApiData } from "@/lib/use-api";
import { formatBytes, formatDateTime } from "@/lib/format";
import type { DocumentRecord, Paginated, SubjectDetail } from "@/types/api";
import {
  Alert,
  Badge,
  Button,
  Card,
  CardHeader,
  EmptyState,
  Field,
  ProgressBar,
  Select,
  Spinner,
  StatusBadge,
  cn,
} from "@/components/ui";

const STATUSES = ["", "UPLOADED", "PROCESSING", "PROCESSED", "FAILED"] as const;
const ACCEPTED_EXTENSIONS = [".pdf", ".docx", ".txt"];

export function SubjectDocuments({
  subject,
  onRefresh,
}: {
  subject: SubjectDetail;
  onRefresh: () => Promise<void> | void;
}) {
  const subjectId = subject.id;
  const [status, setStatus] = useState("");
  const [uploadTopicId, setUploadTopicId] = useState("");
  const [page, setPage] = useState(1);
  const query = new URLSearchParams({ page: String(page), pageSize: "10" });
  if (status) query.set("status", status);

  const { data, error, loading, reload } = useApiData<Paginated<DocumentRecord>>(
    `/api/admin/subjects/${subjectId}/documents?${query.toString()}`,
  );

  const [message, setMessage] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [pendingFile, setPendingFile] = useState<File | null>(null);
  const [dragActive, setDragActive] = useState(false);
  const [busyId, setBusyId] = useState<number | null>(null);
  const fileRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (!data) return;
    const pending = data.items.some(
      (document) => document.status === "PROCESSING" || document.status === "UPLOADED",
    );
    const generating = data.items.some(
      (document) => document.questionGenerationStatus === "RUNNING",
    );
    const recentlyProcessed = data.items.some(
      (document) =>
        document.status === "PROCESSED" &&
        document.processedAt !== null &&
        Date.now() - new Date(document.processedAt).getTime() < 5 * 60 * 1000,
    );
    if (!pending && !generating && !recentlyProcessed) return;
    const timer = setInterval(() => {
      void reload();
      void onRefresh();
    }, 6000);
    return () => clearInterval(timer);
  }, [data, onRefresh, reload]);

  function chooseFile(file: File) {
    const ext = `.${file.name.split(".").pop()?.toLowerCase() ?? ""}`;
    if (!ACCEPTED_EXTENSIONS.includes(ext)) {
      setActionError("Only PDF, DOCX, and TXT files are supported.");
      return;
    }
    setActionError(null);
    setPendingFile(file);
  }

  async function upload(file: File) {
    setUploading(true);
    setUploadProgress(0);
    setActionError(null);
    setMessage(null);
    const form = new FormData();
    form.set("file", file);
    if (uploadTopicId) form.set("topicId", uploadTopicId);
    try {
      await apiUpload(`/api/admin/subjects/${subjectId}/documents`, form, setUploadProgress);
      setUploadProgress(100);
      setMessage(
        `"${file.name}" uploaded. Processing and automatic generation of all topic-related subjective questions are running in the background.`,
      );
      setPendingFile(null);
      if (fileRef.current) fileRef.current.value = "";
      setPage(1);
      await reload();
      await onRefresh();
    } catch (failure) {
      setActionError(getErrorMessage(failure));
    } finally {
      setUploading(false);
      setUploadProgress(0);
    }
  }

  async function reprocess(document: DocumentRecord) {
    setBusyId(document.id);
    setActionError(null);
    setMessage(null);
    try {
      await apiFetch(`/api/admin/documents/${document.id}/process`, { method: "POST" });
      setMessage(`Reprocessing "${document.originalFilename}".`);
      await reload();
    } catch (failure) {
      setActionError(getErrorMessage(failure));
    } finally {
      setBusyId(null);
    }
  }

  async function download(document: DocumentRecord) {
    setBusyId(document.id);
    setActionError(null);
    try {
      const result = await apiFetch<{ downloadUrl: string }>(
        `/api/admin/documents/${document.id}`,
      );
      window.open(result.downloadUrl, "_blank", "noopener,noreferrer");
    } catch (failure) {
      setActionError(getErrorMessage(failure));
    } finally {
      setBusyId(null);
    }
  }

  async function remove(document: DocumentRecord) {
    if (!window.confirm(`Delete "${document.originalFilename}"? Its chunks are removed too.`)) {
      return;
    }
    setBusyId(document.id);
    setActionError(null);
    setMessage(null);
    try {
      await apiFetch(`/api/admin/documents/${document.id}`, { method: "DELETE" });
      setMessage("Document deleted.");
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
      <Card>
        <CardHeader
          title="Study material"
          description="Upload a PDF, DOCX, or TXT file. Questions are generated automatically and assigned to the topic you choose."
        />

        <div className="px-4 pt-4">
          <div className="rounded-2xl border border-indigo-100 bg-gradient-to-br from-indigo-50 via-white to-slate-50 p-4 shadow-sm">
            <div className="grid gap-4">
              <Field
                label="Question topic"
                htmlFor="upload-topic"
                hint="Generated questions will be assigned to this topic."
              >
                <Select
                  id="upload-topic"
                  value={uploadTopicId}
                  onChange={(event) => setUploadTopicId(event.target.value)}
                  className="w-full"
                  disabled={uploading}
                >
                  <option value="">No topic (uncategorized)</option>
                  {subject.topics.map((topic) => (
                    <option key={topic.id} value={topic.id}>
                      {topic.name}
                    </option>
                  ))}
                </Select>
              </Field>

              <div>
                <p className="mb-1 text-xs font-medium text-slate-700">Study file</p>
                <input
                  ref={fileRef}
                  type="file"
                  accept=".pdf,.docx,.txt"
                  className="hidden"
                  onChange={(event) => {
                    const file = event.target.files?.[0];
                    if (file) chooseFile(file);
                  }}
                />
                <div
                  onDragOver={(event) => {
                    event.preventDefault();
                    if (!uploading) setDragActive(true);
                  }}
                  onDragLeave={() => setDragActive(false)}
                  onDrop={(event) => {
                    event.preventDefault();
                    setDragActive(false);
                    if (uploading) return;
                    const file = event.dataTransfer.files?.[0];
                    if (file) chooseFile(file);
                  }}
                  className={cn(
                    "flex min-h-11 items-center rounded-lg border border-dashed px-3 py-2 transition-colors",
                    dragActive
                      ? "border-indigo-400 bg-indigo-50"
                      : "border-slate-300 bg-white/80",
                  )}
                >
                  {pendingFile ? (
                    <div className="flex w-full items-center gap-2">
                      <Badge tone="indigo">
                        {pendingFile.name.split(".").pop()?.toUpperCase() ?? "FILE"}
                      </Badge>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium text-slate-800">
                          {pendingFile.name}
                        </p>
                        <p className="text-[11px] text-slate-500">
                          {formatBytes(pendingFile.size)}
                        </p>
                      </div>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => {
                          setPendingFile(null);
                          if (fileRef.current) fileRef.current.value = "";
                        }}
                        disabled={uploading}
                      >
                        Remove
                      </Button>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => fileRef.current?.click()}
                      className="flex w-full flex-wrap items-center gap-1 text-left text-sm text-slate-500"
                    >
                      <span className="font-medium text-indigo-700">Choose a file</span>
                      <span>or drag and drop PDF, DOCX, or TXT</span>
                    </button>
                  )}
                </div>
              </div>

              <Button
                onClick={() => {
                  if (pendingFile) void upload(pendingFile);
                }}
                loading={uploading}
                disabled={!pendingFile || uploading}
                className="w-full"
              >
                Upload & generate
              </Button>
              <p className="text-[11px] text-slate-500">
                AI adds all subjective questions {uploadTopicId ? "related to the selected topic" : "covered by the document"} with no answer options.
              </p>
            </div>

            {uploading ? (
              <div className="mt-4 rounded-lg border border-indigo-200 bg-white/90 px-3 py-2.5">
                <div className="flex items-center justify-between gap-3 text-xs font-medium text-indigo-800">
                  <span className="truncate">Uploading {pendingFile?.name ?? "document"}…</span>
                  <span className="tabular-nums">{uploadProgress}%</span>
                </div>
                <div className="mt-2">
                  <ProgressBar value={uploadProgress} />
                </div>
              </div>
            ) : null}

            {subject.topics.length === 0 ? (
              <p className="mt-3 text-[11px] text-slate-500">
                Tip: create topics in the Topics tab to organize generated questions.
              </p>
            ) : null}
          </div>
        </div>

        {message ? (
          <div className="px-4 pt-4">
            <Alert tone="success">{message}</Alert>
          </div>
        ) : null}
        {actionError ? (
          <div className="px-4 pt-4">
            <Alert tone="error">{actionError}</Alert>
          </div>
        ) : null}

        <div className="flex items-center justify-between gap-3 border-b border-slate-100 px-4 py-3">
          <p className="text-xs text-slate-500">
            Processing and question generation happen in the background.
          </p>
          <Select
            value={status}
            onChange={(event) => {
              setStatus(event.target.value);
              setPage(1);
            }}
            aria-label="Filter documents by status"
            className="w-44"
          >
            {STATUSES.map((value) => (
              <option key={value || "all"} value={value}>
                {value === "" ? "All statuses" : value.charAt(0) + value.slice(1).toLowerCase()}
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
            <Spinner /> Loading documents…
          </div>
        ) : null}

        {data && data.items.length === 0 ? (
          <EmptyState
            title="No documents"
            description="Upload the subject's textbook, notes, or slides to power the study assistant and generate questions."
          />
        ) : null}

        {data && data.items.length > 0 ? (
          <>
            <ul className="divide-y divide-slate-100">
              {data.items.map((document) => (
                <li key={document.id} className="px-5 py-3">
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-slate-900">
                        {document.originalFilename}
                      </p>
                      <p className="mt-0.5 text-xs text-slate-500">
                        {formatBytes(document.sizeBytes)} · uploaded{" "}
                        {formatDateTime(document.createdAt)} by {document.uploader.name}
                      </p>
                      <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
                        <StatusBadge status={document.status} />
                        {document.pageCount !== null ? (
                          <Badge tone="slate">{document.pageCount} pages</Badge>
                        ) : null}
                        <Badge tone="slate">{document.chunkCount} chunks</Badge>
                        {document.topic ? (
                          <Badge tone="indigo">{document.topic.name}</Badge>
                        ) : null}
                        {document.processedAt ? (
                          <span className="text-[11px] text-slate-400">
                            processed {formatDateTime(document.processedAt)}
                          </span>
                        ) : null}
                      </div>
                      {document.errorMessage ? (
                        <p className="mt-1 text-xs text-rose-600">{document.errorMessage}</p>
                      ) : null}
                      {document.questionGenerationStatus === "RUNNING" ? (
                        <div className="mt-2 max-w-md">
                          <div className="flex items-center justify-between gap-3 text-[11px] font-medium text-indigo-700">
                            <span className="truncate">
                              {document.questionGenerationMessage ?? "Generating questions…"}
                            </span>
                            <span className="tabular-nums">
                              {Math.max(0, Math.min(100, document.questionGenerationProgress))}%
                            </span>
                          </div>
                          <div className="mt-1">
                            <ProgressBar value={document.questionGenerationProgress} />
                          </div>
                        </div>
                      ) : document.questionGenerationStatus === "COMPLETED" ? (
                        <p className="mt-1.5 text-xs text-emerald-700">
                          {document.questionGenerationMessage ??
                            `${document.generatedQuestionCount} AI questions added.`}
                        </p>
                      ) : document.questionGenerationStatus === "FAILED" ? (
                        <p className="mt-1.5 text-xs text-rose-600">
                          {document.questionGenerationMessage ?? "Question generation failed."}
                        </p>
                      ) : null}
                    </div>
                    <div className="flex shrink-0 items-center gap-1">
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => void download(document)}
                        disabled={busyId === document.id}
                      >
                        Download
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => void reprocess(document)}
                        loading={busyId === document.id}
                        disabled={document.status === "PROCESSING"}
                      >
                        Reprocess
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="text-rose-600 hover:bg-rose-50 hover:text-rose-700"
                        onClick={() => void remove(document)}
                        disabled={busyId === document.id}
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
                {data.pagination.total} documents
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
