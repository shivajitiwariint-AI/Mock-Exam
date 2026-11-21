"use client";

import Link from "next/link";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { useApiData } from "@/lib/use-api";
import { formatDate, formatDuration, percent } from "@/lib/format";
import type { StudentDashboard } from "@/types/api";
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
  StatCard,
  StatusBadge,
} from "@/components/ui";

export default function StudentDashboardPage() {
  const { data, error, loading, reload } = useApiData<StudentDashboard>(
    "/api/dashboard/overview",
  );

  return (
    <div className="space-y-6">
      <PageHeader
        title="Dashboard"
        description="Your attempts, subject trends, and the topics that need another pass."
        action={
          <Link
            href="/exams"
            className="inline-flex h-10 items-center rounded-lg bg-indigo-600 px-4 text-sm font-medium text-white shadow-sm hover:bg-indigo-500"
          >
            Browse exams
          </Link>
        }
      />

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
          <Spinner /> Loading your progress…
        </Card>
      ) : null}

      {data ? (
        <>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <StatCard
              label="Attempts"
              value={data.summary.totalAttempts}
              hint={`${data.summary.completedAttempts} completed · ${data.summary.inProgressAttempts} in progress`}
            />
            <StatCard
              label="Average score"
              value={percent(data.summary.averagePercentage)}
              hint="Across completed attempts"
              accent="emerald"
            />
            <StatCard
              label="Best score"
              value={percent(data.summary.bestPercentage)}
              hint="Personal best so far"
              accent="amber"
            />
            <StatCard
              label="Weak topics"
              value={data.weakTopics.length}
              hint="Topics with enough data to rank"
              accent="sky"
            />
          </div>

          <div className="grid gap-4 lg:grid-cols-5">
            <Card className="lg:col-span-3">
              <CardHeader
                title="Score trend"
                description="Your last ten completed attempts, oldest to newest."
              />
              <div className="h-64 px-2 py-4">
                {data.trend.length === 0 ? (
                  <EmptyState
                    title="No completed attempts yet"
                    description="Finish an exam to start building your trend line."
                  />
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={data.trend} margin={{ top: 8, right: 16, left: -12, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                      <XAxis
                        dataKey="date"
                        tickFormatter={(value: string) => formatDate(value)}
                        tick={{ fontSize: 11, fill: "#64748b" }}
                        tickLine={false}
                        axisLine={false}
                      />
                      <YAxis
                        domain={[0, 100]}
                        tick={{ fontSize: 11, fill: "#64748b" }}
                        tickLine={false}
                        axisLine={false}
                        unit="%"
                      />
                      <Tooltip
                        formatter={(value) => [`${value}%`, "Score"]}
                        labelFormatter={(value) => formatDate(String(value))}
                        contentStyle={{ borderRadius: 12, borderColor: "#e2e8f0", fontSize: 12 }}
                      />
                      <Line
                        type="monotone"
                        dataKey="percentage"
                        stroke="#6366f1"
                        strokeWidth={2.5}
                        dot={{ r: 3, fill: "#6366f1" }}
                        activeDot={{ r: 5 }}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                )}
              </div>
            </Card>

            <Card className="lg:col-span-2">
              <CardHeader title="Subject performance" description="Average score by subject." />
              <div className="h-64 px-2 py-4">
                {data.subjectPerformance.length === 0 ? (
                  <EmptyState
                    title="Nothing to compare yet"
                    description="Subject averages appear after your first completed exam."
                  />
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={data.subjectPerformance}
                      margin={{ top: 8, right: 16, left: -12, bottom: 0 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
                      <XAxis
                        dataKey="name"
                        tick={{ fontSize: 11, fill: "#64748b" }}
                        tickLine={false}
                        axisLine={false}
                        interval={0}
                        height={50}
                        angle={-15}
                        textAnchor="end"
                      />
                      <YAxis
                        domain={[0, 100]}
                        tick={{ fontSize: 11, fill: "#64748b" }}
                        tickLine={false}
                        axisLine={false}
                        unit="%"
                      />
                      <Tooltip
                        formatter={(value) => [`${value}%`, "Average"]}
                        contentStyle={{ borderRadius: 12, borderColor: "#e2e8f0", fontSize: 12 }}
                      />
                      <Bar dataKey="average" fill="#818cf8" radius={[6, 6, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </div>
            </Card>
          </div>

          <div className="grid gap-4 lg:grid-cols-5">
            <Card className="lg:col-span-3">
              <CardHeader
                title="Recent attempts"
                description="Pick up an in-progress attempt or review a result."
                action={
                  <Link href="/history" className="text-xs font-medium text-indigo-600">
                    View all
                  </Link>
                }
              />
              {data.recentAttempts.length === 0 ? (
                <EmptyState
                  title="No attempts yet"
                  description="When you start an exam it will show up here with live status."
                  action={
                    <Link
                      href="/exams"
                      className="text-sm font-medium text-indigo-600 hover:text-indigo-500"
                    >
                      Find an exam →
                    </Link>
                  }
                />
              ) : (
                <ul className="divide-y divide-slate-100">
                  {data.recentAttempts.map((attempt) => (
                    <li
                      key={attempt.id}
                      className="flex flex-col gap-2 px-5 py-3 sm:flex-row sm:items-center sm:justify-between"
                    >
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium text-slate-900">
                          {attempt.exam.title}
                        </p>
                        <p className="mt-0.5 text-xs text-slate-500">
                          {attempt.exam.subject.name} · {formatDate(attempt.startedAt)} · attempt{" "}
                          {attempt.attemptNumber}
                        </p>
                      </div>
                      <div className="flex items-center gap-3">
                        <StatusBadge status={attempt.status} />
                        {attempt.percentage !== null ? (
                          <span
                            className={`text-sm font-semibold ${
                              attempt.passed ? "text-emerald-600" : "text-rose-600"
                            }`}
                          >
                            {percent(attempt.percentage)}
                          </span>
                        ) : null}
                        <Link
                          href={`/attempts/${attempt.id}`}
                          className="text-xs font-medium text-indigo-600 hover:text-indigo-500"
                        >
                          {attempt.status === "IN_PROGRESS" ? "Resume" : "Review"}
                        </Link>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </Card>

            <Card className="lg:col-span-2">
              <CardHeader
                title="Areas to improve"
                description="Lowest accuracy topics across recent questions."
              />
              {data.weakTopics.length === 0 ? (
                <EmptyState
                  title="Not enough data yet"
                  description="Topics need at least three answered questions before they are ranked."
                />
              ) : (
                <ul className="space-y-4 px-5 py-4">
                  {data.weakTopics.map((topic) => (
                    <li key={`${topic.subject}-${topic.topic}`}>
                      <div className="flex items-center justify-between gap-3">
                        <div className="min-w-0">
                          <p className="truncate text-sm font-medium text-slate-900">
                            {topic.topic}
                          </p>
                          <p className="text-xs text-slate-500">{topic.subject}</p>
                        </div>
                        <Badge tone={topic.accuracy < 50 ? "red" : "amber"}>
                          {percent(topic.accuracy)}
                        </Badge>
                      </div>
                      <div className="mt-2">
                        <ProgressBar
                          value={topic.accuracy}
                          tone={topic.accuracy < 50 ? "rose" : "amber"}
                        />
                      </div>
                      <p className="mt-1 text-[11px] text-slate-400">
                        {topic.correct}/{topic.total} correct
                      </p>
                    </li>
                  ))}
                </ul>
              )}
            </Card>
          </div>

          <Card className="flex flex-col gap-3 p-5 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-sm font-medium text-slate-900">Want a different angle?</p>
              <p className="text-xs text-slate-500">
                Ask the study assistant a question grounded in your subject material.
              </p>
            </div>
            <Link
              href="/study"
              className="inline-flex h-10 items-center justify-center rounded-lg border border-slate-300 bg-white px-4 text-sm font-medium text-slate-700 shadow-sm hover:bg-slate-50"
            >
              Open study assistant
            </Link>
          </Card>
        </>
      ) : null}

      {!loading && !data && !error ? (
        <Card className="p-6">
          <Button onClick={() => void reload()}>Load dashboard</Button>
        </Card>
      ) : null}

      {data && data.summary.totalAttempts === 0 ? (
        <p className="text-xs text-slate-400">
          Tip: your first attempt includes a full answer review after submission.
        </p>
      ) : null}

      {data && data.recentAttempts.some((attempt) => attempt.timeTakenSeconds !== null) ? (
        <p className="text-xs text-slate-400">
          Longest recent attempt:{" "}
          {formatDuration(
            Math.max(
              ...data.recentAttempts.map((attempt) => attempt.timeTakenSeconds ?? 0),
            ),
          )}
          .
        </p>
      ) : null}
    </div>
  );
}
