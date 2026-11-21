"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { apiFetch, getErrorMessage } from "@/lib/client-api";
import { useApiData } from "@/lib/use-api";
import { formatDateTime, titleCase } from "@/lib/format";
import type { InterviewSessionView } from "@/types/api";
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
  Textarea,
  cn,
} from "@/components/ui";

const SCORE_TONES = (score: number): "green" | "amber" | "red" => {
  if (score >= 8) return "green";
  if (score >= 5) return "amber";
  return "red";
};

type ProctorEventType =
  | "SCREEN_SHARE_STARTED"
  | "SCREEN_SHARE_STOPPED"
  | "CAMERA_STARTED"
  | "CAMERA_STOPPED"
  | "TAB_HIDDEN"
  | "TAB_VISIBLE"
  | "WINDOW_BLURRED"
  | "WINDOW_FOCUSED"
  | "FULLSCREEN_EXITED"
  | "MIC_USED";

type SpeechRecognitionResultLike = {
  isFinal: boolean;
  0: { transcript: string };
};

type SpeechRecognitionEventLike = {
  resultIndex: number;
  results: {
    length: number;
    [index: number]: SpeechRecognitionResultLike;
  };
};

type SpeechRecognitionLike = {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  onresult: ((event: SpeechRecognitionEventLike) => void) | null;
  onerror: ((event: { error: string }) => void) | null;
  onend: (() => void) | null;
  start: () => void;
  stop: () => void;
};

type SpeechRecognitionCtor = new () => SpeechRecognitionLike;

function appendTranscript(existing: string, addition: string) {
  const text = addition.trim();
  if (!text) return existing;
  if (!existing.trim()) return text;
  return `${existing.replace(/\s+$/, "")} ${text}`;
}

export default function InterviewSessionPage() {
  const params = useParams<{ sessionId: string }>();
  const url = params?.sessionId ? `/api/interviews/sessions/${params.sessionId}` : null;
  const { data, error, loading, reload } = useApiData<InterviewSessionView>(url);

  const [currentId, setCurrentId] = useState<number | null>(null);
  const [draftState, setDraftState] = useState<{ questionId: number | null; text: string }>({
    questionId: null,
    text: "",
  });
  const [submitting, setSubmitting] = useState(false);
  const [polishing, setPolishing] = useState(false);
  const [completing, setCompleting] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [proctorActive, setProctorActive] = useState(false);
  const [proctorStarting, setProctorStarting] = useState(false);
  const [screenOn, setScreenOn] = useState(false);
  const [cameraOn, setCameraOn] = useState(false);
  const [proctorError, setProctorError] = useState<string | null>(null);
  const [listening, setListening] = useState(false);
  const [micError, setMicError] = useState<string | null>(null);
  const screenStreamRef = useRef<MediaStream | null>(null);
  const cameraStreamRef = useRef<MediaStream | null>(null);
  const screenVideoRef = useRef<HTMLVideoElement>(null);
  const cameraVideoRef = useRef<HTMLVideoElement>(null);
  const recognitionRef = useRef<SpeechRecognitionLike | null>(null);
  const stoppingRef = useRef(false);

  const sendProctorEvent = useCallback(
    (type: ProctorEventType, metadata?: Record<string, unknown>) => {
      const sessionId = params?.sessionId;
      if (!sessionId) return;
      void apiFetch(`/api/interviews/sessions/${sessionId}/proctor`, {
        method: "POST",
        body: JSON.stringify({ type, metadata }),
      }).catch(() => undefined);
    },
    [params?.sessionId],
  );

  const stopProctoring = useCallback(
    (notify: boolean) => {
      stoppingRef.current = true;
      const screen = screenStreamRef.current;
      const camera = cameraStreamRef.current;
      screenStreamRef.current = null;
      cameraStreamRef.current = null;
      screen?.getTracks().forEach((track) => track.stop());
      camera?.getTracks().forEach((track) => track.stop());
      if (screenVideoRef.current) screenVideoRef.current.srcObject = null;
      if (cameraVideoRef.current) cameraVideoRef.current.srcObject = null;
      try {
        recognitionRef.current?.stop();
      } catch {}
      setProctorActive(false);
      setScreenOn(false);
      setCameraOn(false);
      setListening(false);
      if (notify) {
        sendProctorEvent("SCREEN_SHARE_STOPPED");
        sendProctorEvent("CAMERA_STOPPED");
      }
      if (typeof document !== "undefined" && document.fullscreenElement) {
        void document.exitFullscreen().catch(() => undefined);
      }
    },
    [sendProctorEvent],
  );

  useEffect(() => {
    if (!proctorActive) return;
    const onVisibility = () =>
      sendProctorEvent(document.hidden ? "TAB_HIDDEN" : "TAB_VISIBLE");
    const onBlur = () => sendProctorEvent("WINDOW_BLURRED");
    const onFocus = () => sendProctorEvent("WINDOW_FOCUSED");
    const onFullscreenChange = () => {
      if (!document.fullscreenElement && !stoppingRef.current) {
        sendProctorEvent("FULLSCREEN_EXITED");
      }
    };
    document.addEventListener("visibilitychange", onVisibility);
    document.addEventListener("fullscreenchange", onFullscreenChange);
    window.addEventListener("blur", onBlur);
    window.addEventListener("focus", onFocus);
    return () => {
      document.removeEventListener("visibilitychange", onVisibility);
      document.removeEventListener("fullscreenchange", onFullscreenChange);
      window.removeEventListener("blur", onBlur);
      window.removeEventListener("focus", onFocus);
    };
  }, [proctorActive, sendProctorEvent]);

  useEffect(() => {
    return () => {
      stoppingRef.current = true;
      screenStreamRef.current?.getTracks().forEach((track) => track.stop());
      cameraStreamRef.current?.getTracks().forEach((track) => track.stop());
      try {
        recognitionRef.current?.stop();
      } catch {}
      if (document.fullscreenElement) {
        void document.exitFullscreen().catch(() => undefined);
      }
    };
  }, []);

  const answersByQuestion = useMemo(() => {
    const map = new Map<number, InterviewSessionView["answers"][number]>();
    for (const answer of data?.answers ?? []) map.set(answer.questionId, answer);
    return map;
  }, [data]);

  const questions = data?.questions ?? [];
  const firstUnanswered = questions.find((question) => !answersByQuestion.has(question.id));
  const current =
    questions.find((question) => question.id === currentId) ?? firstUnanswered ?? questions[0];
  const activeQuestionId = current?.id ?? null;
  const draftStoragePrefix = params?.sessionId ? `interview-draft:${params.sessionId}:` : null;

  function saveDraft(questionId: number, text: string) {
    if (typeof window === "undefined" || !draftStoragePrefix) return;
    const key = `${draftStoragePrefix}${questionId}`;
    if (text.trim()) {
      window.localStorage.setItem(key, text);
    } else {
      window.localStorage.removeItem(key);
    }
  }

  function clearDraft(questionId: number) {
    if (typeof window === "undefined" || !draftStoragePrefix) return;
    window.localStorage.removeItem(`${draftStoragePrefix}${questionId}`);
  }

  function clearAllDrafts() {
    if (typeof window === "undefined" || !draftStoragePrefix) return;
    const toRemove: string[] = [];
    for (let index = 0; index < window.localStorage.length; index += 1) {
      const key = window.localStorage.key(index);
      if (key && key.startsWith(draftStoragePrefix)) toRemove.push(key);
    }
    for (const key of toRemove) window.localStorage.removeItem(key);
  }
  const answeredCount = questions.filter((question) => answersByQuestion.has(question.id)).length;
  const allAnswered = questions.length > 0 && answeredCount === questions.length;
  const completed = data?.session.status === "COMPLETED";

  if (activeQuestionId && draftState.questionId !== activeQuestionId) {
    const savedDraft =
      typeof window !== "undefined"
        ? window.localStorage.getItem(`${draftStoragePrefix}${activeQuestionId}`)
        : null;
    setDraftState({
      questionId: activeQuestionId,
      text: answersByQuestion.get(activeQuestionId)?.answerText ?? savedDraft ?? "",
    });
  }
  const draft = draftState.questionId === activeQuestionId ? draftState.text : "";

  useEffect(() => {
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch {}
      setListening(false);
    }
  }, [activeQuestionId]);

  async function startProctoring() {
    if (proctorStarting || !data) return;
    stoppingRef.current = false;
    setProctorStarting(true);
    setProctorError(null);
    setMicError(null);

    let screen: MediaStream | null = null;
    let camera: MediaStream | null = null;
    try {
      if (!navigator.mediaDevices?.getDisplayMedia || !navigator.mediaDevices?.getUserMedia) {
        throw new Error("This browser does not support screen and camera capture.");
      }

      screen = await navigator.mediaDevices.getDisplayMedia({
        video: { displaySurface: "monitor" } as MediaTrackConstraints,
        audio: false,
      });
      camera = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: "user",
          width: { ideal: 640 },
          height: { ideal: 480 },
        },
        audio: false,
      });

      const screenTrack = screen.getVideoTracks()[0];
      const cameraTrack = camera.getVideoTracks()[0];
      if (!screenTrack || !cameraTrack) {
        throw new Error("Screen and camera feeds are both required.");
      }
      const displaySurface = (
        screenTrack.getSettings() as MediaTrackSettings & { displaySurface?: string }
      ).displaySurface;
      if (displaySurface && displaySurface !== "monitor") {
        throw new Error("Choose the Entire Screen option when sharing your screen.");
      }

      screenStreamRef.current = screen;
      cameraStreamRef.current = camera;
      if (screenVideoRef.current) {
        screenVideoRef.current.srcObject = screen;
        await screenVideoRef.current.play().catch(() => undefined);
      }
      if (cameraVideoRef.current) {
        cameraVideoRef.current.srcObject = camera;
        await cameraVideoRef.current.play().catch(() => undefined);
      }

      setScreenOn(true);
      setCameraOn(true);
      setProctorActive(true);
      sendProctorEvent("SCREEN_SHARE_STARTED");
      sendProctorEvent("CAMERA_STARTED");

      screenTrack.addEventListener("ended", () => {
        if (stoppingRef.current) return;
        setProctorError("Screen sharing stopped. Restart proctoring before answering again.");
        sendProctorEvent("SCREEN_SHARE_STOPPED");
        stopProctoring(false);
      });
      cameraTrack.addEventListener("ended", () => {
        if (stoppingRef.current) return;
        setProctorError("Camera stopped. Restart proctoring before answering again.");
        sendProctorEvent("CAMERA_STOPPED");
        stopProctoring(false);
      });

      try {
        if (!document.fullscreenElement) {
          await document.documentElement.requestFullscreen();
        }
      } catch {
        // Fullscreen is optional; screen and camera capture are the required checks.
      }
    } catch (failure) {
      screen?.getTracks().forEach((track) => track.stop());
      camera?.getTracks().forEach((track) => track.stop());
      screenStreamRef.current = null;
      cameraStreamRef.current = null;
      setScreenOn(false);
      setCameraOn(false);
      setProctorActive(false);
      setProctorError(
        failure instanceof DOMException && failure.name === "NotAllowedError"
          ? "Screen share and camera permissions are required to take this interview."
          : failure instanceof Error
            ? failure.message
            : "Could not start proctoring.",
      );
    } finally {
      setProctorStarting(false);
    }
  }

  function toggleListening() {
    if (listening) {
      try {
        recognitionRef.current?.stop();
      } catch {}
      setListening(false);
      return;
    }
    const speechWindow = window as unknown as {
      SpeechRecognition?: SpeechRecognitionCtor;
      webkitSpeechRecognition?: SpeechRecognitionCtor;
    };
    const Recognition = speechWindow.SpeechRecognition ?? speechWindow.webkitSpeechRecognition;
    if (!Recognition) {
      setMicError("Voice input is not supported in this browser. Type your answer instead.");
      return;
    }

    const recognition = new Recognition();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = navigator.language || "en-US";
    recognition.onresult = (event) => {
      let finalText = "";
      for (let index = event.resultIndex; index < event.results.length; index += 1) {
        const result = event.results[index];
        if (result?.isFinal) {
          finalText = appendTranscript(finalText, result[0]?.transcript ?? "");
        }
      }
      if (!finalText.trim()) return;
      setDraftState((previous) => ({
        questionId: activeQuestionId,
        text: appendTranscript(previous.text, finalText),
      }));
    };
    recognition.onerror = (event) => {
      setListening(false);
      if (event.error === "aborted") return;
      if (event.error === "not-allowed" || event.error === "service-not-allowed") {
        setMicError("Microphone permission was denied. Allow mic access or type your answer.");
      } else if (event.error === "no-speech") {
        setMicError("No speech detected. Try again or type your answer.");
      } else {
        setMicError("Voice input stopped unexpectedly. Try again or type your answer.");
      }
    };
    recognition.onend = () => setListening(false);
    recognitionRef.current = recognition;

    try {
      recognition.start();
      setMicError(null);
      setListening(true);
      sendProctorEvent("MIC_USED");
    } catch {
      setMicError("Could not start the microphone. Type your answer instead.");
    }
  }

  async function submitAnswer() {
    if (!current || !data || !draft.trim() || submitting) return;
    setSubmitting(true);
    setActionError(null);
    try {
      await apiFetch(`/api/interviews/sessions/${data.session.id}/answer`, {
        method: "POST",
        body: JSON.stringify({ questionId: current.id, answerText: draft }),
      });
      clearDraft(current.id);
      await reload();
    } catch (failure) {
      setActionError(getErrorMessage(failure));
    } finally {
      setSubmitting(false);
    }
  }

  async function polishAnswer() {
    if (!current || !data || !draft.trim() || polishing) return;
    setPolishing(true);
    setActionError(null);
    try {
      const result = await apiFetch<{ polished: string }>(
        `/api/interviews/sessions/${data.session.id}/answer/polish`,
        {
          method: "POST",
          body: JSON.stringify({ questionId: current.id, answerText: draft }),
        },
      );
      setDraftState({ questionId: activeQuestionId, text: result.polished });
    } catch (failure) {
      setActionError(getErrorMessage(failure));
    } finally {
      setPolishing(false);
    }
  }

  async function completeInterview() {
    if (!data || completing) return;
    setCompleting(true);
    setActionError(null);
    try {
      await apiFetch(`/api/interviews/sessions/${data.session.id}/complete`, {
        method: "POST",
      });
      stopProctoring(false);
      clearAllDrafts();
      await reload();
    } catch (failure) {
      setActionError(getErrorMessage(failure));
    } finally {
      setCompleting(false);
    }
  }

  if (loading && !data) {
    return (
      <Card className="flex items-center justify-center gap-2 py-16 text-sm text-slate-500">
        <Spinner /> Loading interview session…
      </Card>
    );
  }

  if (error || !data) {
    return (
      <div className="space-y-4">
        <Alert tone="error">
          {error ?? "Interview session not found."}{" "}
          <button className="underline" onClick={() => void reload()}>
            Retry
          </button>
        </Alert>
        <Link href="/interviews" className="text-sm font-medium text-indigo-600">
          ← Back to interview prep
        </Link>
      </div>
    );
  }

  if (completed) {
    return (
      <div className="space-y-6">
        <div>
          <Link
            href="/interviews"
            className="text-xs font-medium text-slate-500 hover:text-slate-900"
          >
            ← Interview prep
          </Link>
        </div>

        <PageHeader
          title="Interview debrief"
          description={`${data.prep.title}${
            data.prep.company ? ` · ${data.prep.company}` : ""
          } · finished ${formatDateTime(data.session.completedAt)}`}
          action={<StatusBadge status={data.session.status} />}
        />

        <div className="grid gap-4 sm:grid-cols-3">
          <Card className="p-5">
            <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
              Overall score
            </p>
            <p className="mt-2 text-4xl font-semibold text-slate-900">
              {data.session.overallScore ?? "—"}
              <span className="text-base font-normal text-slate-400">/100</span>
            </p>
          </Card>
          <Card className="p-5">
            <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Answered</p>
            <p className="mt-2 text-4xl font-semibold text-slate-900">
              {answeredCount}
              <span className="text-base font-normal text-slate-400">/{questions.length}</span>
            </p>
          </Card>
          <Card className="p-5">
            <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
              Average per answer
            </p>
            <p className="mt-2 text-4xl font-semibold text-slate-900">
              {answeredCount > 0
                ? (
                    data.answers.reduce((total, answer) => total + (answer.score ?? 0), 0) /
                    answeredCount
                  ).toFixed(1)
                : "—"}
              <span className="text-base font-normal text-slate-400">/10</span>
            </p>
          </Card>
        </div>

        {data.session.summary ? (
          <Card>
            <CardHeader title="Coach summary" />
            <p className="whitespace-pre-wrap p-5 text-sm leading-6 text-slate-700">
              {data.session.summary}
            </p>
          </Card>
        ) : null}

        <div className="grid gap-4 lg:grid-cols-2">
          <Card>
            <CardHeader title="Strengths" description="What you did well in this interview." />
            {data.session.strengths.length === 0 ? (
              <EmptyState title="No strengths captured" />
            ) : (
              <ul className="space-y-2 p-5 text-sm text-slate-700">
                {data.session.strengths.map((item) => (
                  <li key={item} className="flex gap-2">
                    <span className="text-emerald-600">✓</span>
                    {item}
                  </li>
                ))}
              </ul>
            )}
          </Card>
          <Card>
            <CardHeader
              title="Improve next"
              description="Prioritised areas to work on before the real interview."
            />
            {data.session.improvementAreas.length === 0 ? (
              <EmptyState title="No improvement areas captured" />
            ) : (
              <ul className="space-y-2 p-5 text-sm text-slate-700">
                {data.session.improvementAreas.map((item) => (
                  <li key={item} className="flex gap-2">
                    <span className="text-amber-600">→</span>
                    {item}
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </div>

        {data.session.recommendedPractice.length > 0 ? (
          <Card>
            <CardHeader
              title="Recommended practice"
              description="Concrete exercises to close the gaps."
            />
            <ul className="space-y-2 p-5 text-sm text-slate-700">
              {data.session.recommendedPractice.map((item) => (
                <li key={item} className="flex gap-2">
                  <span className="text-indigo-600">•</span>
                  {item}
                </li>
              ))}
            </ul>
          </Card>
        ) : null}

        <Card>
          <CardHeader
            title="Answer review"
            description="Every question, your answer, and the coach's feedback."
          />
          <ol className="divide-y divide-slate-100">
            {questions.map((question) => {
              const answer = answersByQuestion.get(question.id);
              return (
                <li key={question.id} className="space-y-3 p-5">
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge tone="slate">Q{question.order}</Badge>
                    <Badge tone="violet">{titleCase(question.category)}</Badge>
                    <Badge tone="slate">{titleCase(question.difficulty)}</Badge>
                    {answer?.score !== null && answer?.score !== undefined ? (
                      <Badge tone={SCORE_TONES(answer.score)}>{answer.score}/10</Badge>
                    ) : (
                      <Badge tone="slate">Not answered</Badge>
                    )}
                  </div>
                  <p className="text-sm font-medium text-slate-900">{question.questionText}</p>
                  {answer ? (
                    <div className="space-y-3">
                      <div>
                        <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">
                          Your answer
                        </p>
                        <p className="mt-1 whitespace-pre-wrap text-sm text-slate-700">
                          {answer.answerText}
                        </p>
                      </div>
                      {answer.feedback ? (
                        <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
                          <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">
                            Feedback
                          </p>
                          <p className="mt-1 whitespace-pre-wrap text-sm text-slate-700">
                            {answer.feedback}
                          </p>
                        </div>
                      ) : null}
                      {answer.improvement ? (
                        <p className="text-sm text-amber-700">
                          <span className="font-medium">Next step: </span>
                          {answer.improvement}
                        </p>
                      ) : null}
                      {answer.idealAnswer ? (
                        <details className="text-sm">
                          <summary className="cursor-pointer text-xs font-medium text-indigo-600">
                            Show model answer outline
                          </summary>
                          <p className="mt-2 whitespace-pre-wrap text-slate-600">
                            {answer.idealAnswer}
                          </p>
                        </details>
                      ) : null}
                    </div>
                  ) : (
                    <p className="text-xs text-slate-500">You did not answer this question.</p>
                  )}
                </li>
              );
            })}
          </ol>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <Link
          href="/interviews"
          className="text-xs font-medium text-slate-500 hover:text-slate-900"
        >
          ← Interview prep
        </Link>
      </div>

      <PageHeader
        title={data.prep.title}
        description={`${data.prep.company ?? "Practice interview"}${
          data.prep.role ? ` · ${data.prep.role}` : ""
        } · started ${formatDateTime(data.session.startedAt)}`}
        action={<StatusBadge status={data.session.status} />}
      />

      {actionError ? <Alert tone="error">{actionError}</Alert> : null}

      <Card
        className={cn(
          "border-2",
          proctorActive ? "border-emerald-200" : "border-amber-300",
        )}
      >
        <CardHeader
          title="Proctoring"
          description="Share your entire screen and keep your camera on for the whole interview."
          action={
            <Badge tone={proctorActive ? "green" : "amber"}>
              {proctorActive ? "Active" : "Required"}
            </Badge>
          }
        />
        <div className="space-y-4 p-5">
          {proctorError ? <Alert tone="error">{proctorError}</Alert> : null}
          {!proctorActive ? (
            <Alert tone="warning">
              Start proctoring before you submit answers. Tab switches, window focus changes,
              fullscreen exits, and stopped screen or camera feeds are logged for admin review.
            </Alert>
          ) : null}

          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <div className="relative aspect-video overflow-hidden rounded-xl bg-slate-900">
                <video
                  ref={screenVideoRef}
                  autoPlay
                  muted
                  playsInline
                  className={cn(
                    "h-full w-full object-contain transition-opacity",
                    screenOn ? "opacity-100" : "opacity-20",
                  )}
                />
                {!screenOn ? (
                  <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
                    <span className="rounded-md bg-black/60 px-2 py-1 text-xs font-medium text-white">
                      Screen share off
                    </span>
                  </div>
                ) : null}
                <span className="pointer-events-none absolute left-2 top-2 rounded bg-black/60 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-white">
                  Entire screen
                </span>
              </div>
              <p className="mt-1.5 text-xs text-slate-500">
                {screenOn ? "Screen sharing" : "Not sharing"}
              </p>
            </div>
            <div>
              <div className="relative aspect-video overflow-hidden rounded-xl bg-slate-900">
                <video
                  ref={cameraVideoRef}
                  autoPlay
                  muted
                  playsInline
                  className={cn(
                    "h-full w-full -scale-x-100 object-cover transition-opacity",
                    cameraOn ? "opacity-100" : "opacity-20",
                  )}
                />
                {!cameraOn ? (
                  <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
                    <span className="rounded-md bg-black/60 px-2 py-1 text-xs font-medium text-white">
                      Camera off
                    </span>
                  </div>
                ) : null}
                <span className="pointer-events-none absolute left-2 top-2 rounded bg-black/60 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-white">
                  Camera
                </span>
              </div>
              <p className="mt-1.5 text-xs text-slate-500">
                {cameraOn ? "Camera on" : "Camera off"}
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <Button
              onClick={() => void startProctoring()}
              loading={proctorStarting}
              disabled={proctorActive || proctorStarting}
            >
              {proctorActive ? "Proctoring active" : "Start proctoring"}
            </Button>
            <Button
              variant="secondary"
              onClick={() => stopProctoring(true)}
              disabled={!proctorActive}
            >
              Stop proctoring
            </Button>
            <span className="text-xs text-slate-500">
              Both feeds are required. Stopping either one pauses answer submission.
            </span>
          </div>
        </div>
      </Card>

      {questions.length === 0 ? (
        <Card>
          <EmptyState
            title="No questions available"
            description="Return to interview prep and regenerate this kit."
          />
        </Card>
      ) : (
        <>
          <Card className="p-5">
            <div className="flex items-center justify-between gap-3 text-xs text-slate-500">
              <span>
                Answered {answeredCount} of {questions.length}
              </span>
              <span>{Math.round((answeredCount / questions.length) * 100)}% complete</span>
            </div>
            <div className="mt-2">
              <ProgressBar value={(answeredCount / questions.length) * 100} />
            </div>
            <div className="mt-4 flex flex-wrap gap-1.5">
              {questions.map((question) => {
                const answer = answersByQuestion.get(question.id);
                return (
                  <button
                    key={question.id}
                    type="button"
                    onClick={() => setCurrentId(question.id)}
                    className={cn(
                      "h-8 w-8 rounded-lg text-xs font-semibold transition-colors",
                      question.id === current?.id
                        ? "bg-indigo-600 text-white"
                        : answer
                          ? "bg-emerald-50 text-emerald-700 ring-1 ring-inset ring-emerald-200"
                          : "bg-slate-100 text-slate-600 hover:bg-slate-200",
                    )}
                    aria-label={`Question ${question.order}${
                      answer ? ", answered" : ", unanswered"
                    }`}
                  >
                    {question.order}
                  </button>
                );
              })}
            </div>
          </Card>

          {current ? (
            <div className="grid gap-4 lg:grid-cols-3">
              <div className="space-y-4 lg:col-span-2">
                <Card>
                  <CardHeader
                    title={`Question ${current.order}`}
                    description="Answer as you would in a real interview. The coach evaluates clarity, correctness, and structure."
                    action={
                      <div className="flex gap-1.5">
                        <Badge tone="violet">{titleCase(current.category)}</Badge>
                        <Badge tone="slate">{titleCase(current.difficulty)}</Badge>
                      </div>
                    }
                  />
                  <div className="space-y-4 p-5">
                    <p className="text-lg leading-7 text-slate-900">{current.questionText}</p>

                    <div className="flex flex-wrap items-center gap-3">
                      <Button
                        size="sm"
                        variant={listening ? "danger" : "secondary"}
                        onClick={toggleListening}
                        title="Dictate your answer using the microphone"
                      >
                        {listening ? "Stop mic" : "Answer with mic"}
                      </Button>
                      <Button
                        size="sm"
                        variant="secondary"
                        onClick={() => void polishAnswer()}
                        loading={polishing}
                        disabled={!draft.trim() || polishing || submitting}
                        title="Rewrite your answer to be clearer and more presentable"
                      >
                        Polish & clarify
                      </Button>
                      {listening ? (
                        <span className="text-xs font-medium text-rose-600">
                          Listening… speak clearly. Your words are added to the answer.
                        </span>
                      ) : (
                        <span className="text-xs text-slate-400">
                          Dictation appends to your typed answer.
                        </span>
                      )}
                    </div>
                    {micError ? <Alert tone="error">{micError}</Alert> : null}

                    <Textarea
                      value={draft}
                      onChange={(event) => {
                        const text = event.target.value;
                        if (activeQuestionId) saveDraft(activeQuestionId, text);
                        setDraftState({
                          questionId: activeQuestionId,
                          text,
                        });
                      }}
                      rows={7}
                      placeholder="Structure your answer: context, what you did, the result, and what you learned…"
                    />

                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <span className="text-xs text-slate-400">
                        {draft.trim().length} characters ·{" "}
                        {proctorActive
                          ? "AI feedback takes a few seconds"
                          : "Start proctoring to submit"}
                      </span>
                      <div className="flex gap-2">
                        <Button
                          variant="secondary"
                          size="sm"
                          onClick={() => {
                            const index = questions.findIndex(
                              (question) => question.id === current.id,
                            );
                            const previous = questions[index - 1];
                            if (previous) setCurrentId(previous.id);
                          }}
                          disabled={questions.findIndex((q) => q.id === current.id) <= 0}
                        >
                          Previous
                        </Button>
                        <Button
                          size="sm"
                          onClick={() => void submitAnswer()}
                          loading={submitting}
                          disabled={!draft.trim() || !proctorActive}
                        >
                          {answersByQuestion.has(current.id) ? "Re-evaluate answer" : "Submit answer"}
                        </Button>
                      </div>
                    </div>
                  </div>
                </Card>

                {allAnswered ? (
                  <Card className="border-indigo-200 bg-indigo-50/50 p-5">
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                      <div>
                        <p className="text-sm font-semibold text-slate-900">
                          All questions answered
                        </p>
                        <p className="text-xs text-slate-600">
                          Generate an overall debrief with strengths, improvement areas, and
                          recommended practice.
                          {!proctorActive ? " Start proctoring to finish." : ""}
                        </p>
                      </div>
                      <Button
                        onClick={() => void completeInterview()}
                        loading={completing}
                        disabled={completing || !proctorActive}
                      >
                        Finish & get feedback
                      </Button>
                    </div>
                  </Card>
                ) : null}
              </div>

              <div className="space-y-4">
                {answersByQuestion.get(current.id) ? (
                  <Card className="border-emerald-200">
                    <CardHeader title="Coach feedback" />
                    <div className="space-y-3 p-5">
                      <Badge tone={SCORE_TONES(answersByQuestion.get(current.id)?.score ?? 0)}>
                        {answersByQuestion.get(current.id)?.score ?? 0}/10
                      </Badge>
                      <p className="whitespace-pre-wrap text-sm text-slate-700">
                        {answersByQuestion.get(current.id)?.feedback}
                      </p>
                      {answersByQuestion.get(current.id)?.improvement ? (
                        <div className="rounded-lg border border-amber-200 bg-amber-50 p-3">
                          <p className="text-[11px] font-semibold uppercase tracking-wide text-amber-700">
                            Improve next
                          </p>
                          <p className="mt-1 text-sm text-amber-800">
                            {answersByQuestion.get(current.id)?.improvement}
                          </p>
                        </div>
                      ) : null}
                      {answersByQuestion.get(current.id)?.idealAnswer ? (
                        <details className="text-sm">
                          <summary className="cursor-pointer text-xs font-medium text-indigo-600">
                            Show model answer outline
                          </summary>
                          <p className="mt-2 whitespace-pre-wrap text-slate-600">
                            {answersByQuestion.get(current.id)?.idealAnswer}
                          </p>
                        </details>
                      ) : null}
                    </div>
                  </Card>
                ) : (
                  <Card className="p-5">
                    <p className="text-sm font-medium text-slate-900">Tips</p>
                    <ul className="mt-2 space-y-2 text-xs text-slate-600">
                      <li>• Lead with the result, then explain how you got there.</li>
                      <li>• Use concrete examples from the resume you uploaded.</li>
                      <li>• For behavioral questions, use situation → action → result.</li>
                      <li>• Name trade-offs instead of claiming a perfect solution.</li>
                    </ul>
                  </Card>
                )}

                <Card className="p-5">
                  <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
                    Session progress
                  </p>
                  <p className="mt-2 text-sm text-slate-700">
                    {answeredCount} of {questions.length} answered. You can revise any answer
                    before finishing.
                  </p>
                  {allAnswered ? (
                    <Button
                      className="mt-3 w-full"
                      onClick={() => void completeInterview()}
                      loading={completing}
                      disabled={completing || !proctorActive}
                    >
                      Get overall feedback
                    </Button>
                  ) : null}
                </Card>
              </div>
            </div>
          ) : null}
        </>
      )}
    </div>
  );
}
