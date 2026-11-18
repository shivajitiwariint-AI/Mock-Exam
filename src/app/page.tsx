import Link from "next/link";

const FEATURES = [
  {
    title: "Timed mock exams",
    body: "Server-enforced timers, autosaved answers, and idempotent submission so a refresh never costs a student their progress.",
  },
  {
    title: "Grounded study assistant",
    body: "Retrieval-augmented answers cite the exact document chunks they came from, scoped to the subjects each student can access.",
  },
  {
    title: "AI drafts, human review",
    body: "Groq generates multiple-choice drafts from uploaded material; nothing reaches an exam until an administrator approves it.",
  },
  {
    title: "Progress analytics",
    body: "Subject trends, weak topics, and attempt history give students a clear picture of where to focus next.",
  },
];

const STEPS = [
  "Admins upload PDF, DOCX, or TXT study material and process it into searchable chunks.",
  "Approved questions are assembled into exams with availability windows and pass marks.",
  "Students take timed attempts; answers are scored deterministically on the server.",
  "Dashboards turn results into subject trends and topic-level recommendations.",
];

export default function Home() {
  const showDemoCredentials =
    process.env.NODE_ENV !== "production" && process.env.SEED_DEMO === "true";

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="border-b border-slate-200 bg-white/80 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-2.5">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-indigo-500 to-violet-600 text-sm font-bold text-white shadow-sm">
              E
            </span>
            <span className="text-sm font-semibold tracking-tight text-slate-900">ExamForge</span>
          </div>
          <nav className="flex items-center gap-2 text-sm">
            <Link
              href="/login"
              className="rounded-lg px-3 py-2 font-medium text-slate-600 hover:bg-slate-100 hover:text-slate-900"
            >
              Sign in
            </Link>
            <Link
              href="/register"
              className="rounded-lg bg-indigo-600 px-4 py-2 font-medium text-white shadow-sm hover:bg-indigo-500"
            >
              Create account
            </Link>
          </nav>
        </div>
      </header>

      <main>
        <section className="relative overflow-hidden">
          <div
            className="pointer-events-none absolute inset-0 bg-[radial-gradient(60%_60%_at_50%_0%,#e0e7ff_0%,transparent_70%)]"
            aria-hidden="true"
          />
          <div className="relative mx-auto max-w-6xl px-4 pb-20 pt-16 sm:px-6 sm:pt-24 lg:px-8">
            <div className="mx-auto max-w-3xl text-center">
              <span className="inline-flex items-center rounded-full border border-indigo-200 bg-indigo-50 px-3 py-1 text-xs font-medium text-indigo-700">
                Multi-subject · RAG-powered · Server-scored
              </span>
              <h1 className="mt-5 text-4xl font-semibold tracking-tight text-slate-900 sm:text-5xl">
                Practice like it is the real thing.
              </h1>
              <p className="mx-auto mt-4 max-w-2xl text-base leading-7 text-slate-600 sm:text-lg">
                ExamForge turns your course documents into a moderated question bank, runs timed
                mock exams, and shows exactly which topics need another pass.
              </p>
              <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
                <Link
                  href="/register"
                  className="inline-flex h-11 w-full items-center justify-center rounded-lg bg-indigo-600 px-6 text-sm font-medium text-white shadow-sm hover:bg-indigo-500 sm:w-auto"
                >
                  Start practising
                </Link>
                <Link
                  href="/login"
                  className="inline-flex h-11 w-full items-center justify-center rounded-lg border border-slate-300 bg-white px-6 text-sm font-medium text-slate-700 shadow-sm hover:bg-slate-50 sm:w-auto"
                >
                  I already have an account
                </Link>
              </div>
              {showDemoCredentials ? (
                <p className="mt-4 text-xs text-slate-500">
                  Demo student:{" "}
                  <span className="font-mono text-slate-700">student@example.com</span> /{" "}
                  <span className="font-mono text-slate-700">Student12345!</span>
                </p>
              ) : null}
            </div>

            <div className="mt-16 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {[
                ["4", "question formats", "Multiple choice with explanations"],
                ["RAG", "grounded answers", "Citations from your own material"],
                ["Live", "server timers", "Browser clocks cannot be trusted"],
                ["3", "roles", "Super admin, subject admin, student"],
              ].map(([value, label, hint]) => (
                <div
                  key={label}
                  className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"
                >
                  <p className="text-2xl font-semibold tracking-tight text-indigo-600">{value}</p>
                  <p className="mt-1 text-sm font-medium text-slate-900">{label}</p>
                  <p className="mt-1 text-xs text-slate-500">{hint}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="border-y border-slate-200 bg-white py-16">
          <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
            <h2 className="text-2xl font-semibold tracking-tight text-slate-900">
              Built for the whole exam lifecycle
            </h2>
            <p className="mt-2 max-w-2xl text-sm text-slate-600">
              Everything runs behind authenticated, server-authorized APIs. Hiding a button is not
              an access control here.
            </p>
            <div className="mt-8 grid gap-4 sm:grid-cols-2">
              {FEATURES.map((feature) => (
                <div
                  key={feature.title}
                  className="rounded-2xl border border-slate-200 bg-slate-50/60 p-6"
                >
                  <h3 className="text-sm font-semibold text-slate-900">{feature.title}</h3>
                  <p className="mt-2 text-sm leading-6 text-slate-600">{feature.body}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="py-16">
          <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
            <div className="grid gap-10 lg:grid-cols-[1fr_1.2fr] lg:items-center">
              <div>
                <h2 className="text-2xl font-semibold tracking-tight text-slate-900">
                  From document to dashboard
                </h2>
                <p className="mt-2 text-sm leading-6 text-slate-600">
                  The pipeline is deliberately boring where it matters: deterministic scoring,
                  explicit review gates, and access checks on every query.
                </p>
              </div>
              <ol className="space-y-3">
                {STEPS.map((step, index) => (
                  <li
                    key={step}
                    className="flex gap-3 rounded-xl border border-slate-200 bg-white p-4 shadow-sm"
                  >
                    <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-indigo-50 text-xs font-semibold text-indigo-700">
                      {index + 1}
                    </span>
                    <p className="text-sm leading-6 text-slate-600">{step}</p>
                  </li>
                ))}
              </ol>
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t border-slate-200 bg-white">
        <div className="mx-auto flex max-w-6xl flex-col gap-2 px-4 py-8 text-xs text-slate-500 sm:flex-row sm:items-center sm:justify-between sm:px-6 lg:px-8">
          <p>ExamForge — a RAG mock exam platform.</p>
          <p>AI drafts require review. Scores are always computed on the server.</p>
        </div>
      </footer>
    </div>
  );
}
