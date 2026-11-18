"use client";

import Link from "next/link";
import { useParams, useSearchParams } from "next/navigation";
import { useSession } from "next-auth/react";
import { Suspense, useState } from "react";
import { useApiData } from "@/lib/use-api";
import type { SubjectDetail } from "@/types/api";
import { SubjectOverview } from "@/components/admin/subject-overview";
import { SubjectTopics } from "@/components/admin/subject-topics";
import { SubjectDocuments } from "@/components/admin/subject-documents";
import { SubjectQuestions } from "@/components/admin/subject-questions";
import { SubjectExams } from "@/components/admin/subject-exams";
import { SubjectAdmins } from "@/components/admin/subject-admins";
import { Alert, Card, PageHeader, Spinner, StatusBadge, cn } from "@/components/ui";

const TABS = ["overview", "topics", "documents", "questions", "exams", "admins"] as const;
type Tab = (typeof TABS)[number];

const TAB_LABELS: Record<Tab, string> = {
  overview: "Overview",
  topics: "Topics",
  documents: "Documents",
  questions: "Questions",
  exams: "Exams",
  admins: "Admins",
};

function isTab(value: string | null): value is Tab {
  return value !== null && (TABS as readonly string[]).includes(value);
}

export default function AdminSubjectPage() {
  return (
    <Suspense
      fallback={
        <Card className="flex items-center justify-center gap-2 py-16 text-sm text-slate-500">
          <Spinner /> Loading subject…
        </Card>
      }
    >
      <AdminSubjectContent />
    </Suspense>
  );
}

function AdminSubjectContent() {
  const params = useParams<{ subjectId: string }>();
  const searchParams = useSearchParams();
  const { data: session } = useSession();
  const isSuperAdmin = session?.user?.role === "SUPER_ADMIN";
  const requested = searchParams.get("tab");
  const [tab, setTab] = useState<Tab>(isTab(requested) ? requested : "overview");

  const { data: subject, error, loading, reload } = useApiData<SubjectDetail>(
    params?.subjectId ? `/api/admin/subjects/${params.subjectId}` : null,
  );

  if (loading && !subject) {
    return (
      <Card className="flex items-center justify-center gap-2 py-16 text-sm text-slate-500">
        <Spinner /> Loading subject…
      </Card>
    );
  }

  if (error || !subject) {
    return (
      <div className="space-y-4">
        <Alert tone="error">
          {error ?? "Subject not found."}{" "}
          <button className="underline" onClick={() => void reload()}>
            Retry
          </button>
        </Alert>
        <Link href="/admin/subjects" className="text-sm font-medium text-indigo-600">
          ← Back to subjects
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <Link
          href="/admin/subjects"
          className="text-xs font-medium text-slate-500 hover:text-slate-900"
        >
          ← All subjects
        </Link>
      </div>

      <PageHeader
        title={subject.name}
        description={subject.description ?? `/${subject.slug}`}
        action={<StatusBadge status={subject.status} />}
      />

      <div className="flex gap-1 overflow-x-auto border-b border-slate-200 pb-px">
        {TABS.map((value) => {
          const counts: Partial<Record<Tab, number>> = {
            topics: subject.topics.length,
            documents: subject.documentCount,
            questions: subject.questionCount,
            exams: subject.examCount,
            admins: subject.admins.length,
          };
          return (
            <button
              key={value}
              type="button"
              onClick={() => setTab(value)}
              className={cn(
                "-mb-px whitespace-nowrap border-b-2 px-3 py-2 text-sm font-medium transition-colors",
                tab === value
                  ? "border-indigo-600 text-indigo-700"
                  : "border-transparent text-slate-500 hover:border-slate-300 hover:text-slate-800",
              )}
            >
              {TAB_LABELS[value]}
              {counts[value] !== undefined ? (
                <span className="ml-1.5 rounded-full bg-slate-100 px-1.5 py-0.5 text-[10px] text-slate-500">
                  {counts[value]}
                </span>
              ) : null}
            </button>
          );
        })}
      </div>

      {tab === "overview" ? (
        <SubjectOverview subject={subject} isSuperAdmin={isSuperAdmin} onRefresh={reload} />
      ) : null}
      {tab === "topics" ? (
        <SubjectTopics subjectId={subject.id} onRefresh={reload} />
      ) : null}
      {tab === "documents" ? (
        <SubjectDocuments subject={subject} onRefresh={reload} />
      ) : null}
      {tab === "questions" ? (
        <SubjectQuestions subjectId={subject.id} subject={subject} onRefresh={reload} />
      ) : null}
      {tab === "exams" ? (
        <SubjectExams subjectId={subject.id} subject={subject} onRefresh={reload} />
      ) : null}
      {tab === "admins" ? (
        <SubjectAdmins subjectId={subject.id} isSuperAdmin={isSuperAdmin} onRefresh={reload} />
      ) : null}
    </div>
  );
}
