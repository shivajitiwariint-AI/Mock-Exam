# ExamForge

A multi-user, multi-subject mock exam platform built with Next.js. Students study from
subject material with a cited RAG assistant, take timed exams, and review results. Admins
manage subjects, documents, question banks, exams, and users.

## Stack

- Next.js 16 (App Router, Turbopack) and React 19
- Auth.js / NextAuth v5 (credentials + JWT sessions, role-based access)
- Prisma 6 with MySQL (migrations under `prisma/migrations`, JSON embeddings for RAG)
- Tailwind CSS v4, Recharts
- Groq (OpenAI-compatible chat completions) for question generation and the study assistant
- S3-compatible private object storage, with a local `.data/uploads` fallback for development

## Roles

- **Super admin** — manages every subject, all users, and subject-admin assignments.
- **Subject admin** — manages content for assigned subjects: topics, documents, questions,
  exams, and subject admins.
- **Student** — studies material, starts timed attempts, and reviews results.

## Local setup

Requirements: Node.js >= 20.19, a MySQL 8 database, and
a Groq API key for AI features.

```bash
npm install
copy .env.example .env
# point DATABASE_URL at your MySQL database, then:
npx prisma migrate deploy   # applies prisma/migrations/*_init
npm run db:seed
npm run dev
```

For an **existing** database that was created with `prisma db push`, baseline it once so
`prisma migrate deploy` does not try to recreate tables:

```bash
npx prisma migrate resolve --applied 20261118000000_init
```

Open http://localhost:3000.

### Environment

At minimum, set:

- `DATABASE_URL` — MySQL connection string (e.g. `mysql://user:pass@localhost:3306/mock_exam`).
- `AUTH_SECRET` — generate with `npx auth secret`.
- `GROQ_API_KEY` — create one at https://console.groq.com/keys.
- `GROQ_MODEL` — defaults to `openai/gpt-oss-120b`.
- `GROQ_BASE_URL` — defaults to `https://api.groq.com/openai/v1`.

Optional:

- `EMBEDDING_API_KEY` / `EMBEDDING_BASE_URL` / `EMBEDDING_MODEL` — a separate
  OpenAI-compatible embeddings provider. Groq does not provide embeddings, so retrieval
  uses deterministic 1536-dimension local embeddings by default and stores them in the
  `DocumentChunk.embedding` JSON column; cosine similarity is computed in application code.
  Any external provider must return 1536-dimension vectors.
- `S3_*` — private bucket configuration. Without `S3_BUCKET`, uploads are stored under
  `.data/uploads` (development only).
- `MAX_UPLOAD_MB` — upload size limit (default 15).
- `CRON_SECRET` — bearer token for the background job drain endpoint.
- `SEED_DEMO=true` — seed demo subjects, questions, exams, and demo accounts.

### Demo accounts (when seeded)

| Role | Email | Password |
| --- | --- | --- |
| Super admin | `admin@example.com` | `Admin12345!` |
| Subject admin | `subjectadmin@example.com` | `Subject12345!` |
| Student | `student@example.com` | `Student12345!` |

These come from the seed script's defaults; change them via the `SEED_*` variables before
running the seed in any shared environment.

## App routes

Public:

- `/` — landing page
- `/login`, `/register`

Student:

- `/dashboard` — performance summary, trend, weak topics, recent attempts
- `/exams` — published exams with availability and attempt counts
- `/exams/[examId]` — exam details, rules, and attempt history
- `/attempts/[attemptId]` — server-timed attempt runner with autosave, then result review
- `/history` — paginated attempt history
- `/interviews` — upload a resume + company JD, generate a tailored question kit, and
  start a practice interview
- `/interviews/sessions/[sessionId]` — AI-run interview with per-answer coaching and a final
  debrief (strengths, improvement areas, recommended practice)
- `/study` — cited RAG study assistant

Admin:

- `/admin` — platform or scoped dashboard, review queue, failed documents
- `/admin/subjects` — subject list, search, filters, creation
- `/admin/subjects/[subjectId]` — overview, topics, documents, questions, exams, admins.
  Upload study documents, process them, and generate question drafts from the
  Questions tab.
- `/admin/progress` — subject-wise exam performance plus interview practice status for
  every student, including per-subject averages and per-kit session scores (super admin only)
- `/admin/interviews` — AI interview question bank: every generated question with its
  company, role, and job description, searchable by company/JD
- `/admin/users` — user creation, roles, statuses, subject assignments (super admin only)

## Scripts

```bash
npm run dev         # development server
npm run build       # prisma generate + next build
npm run start       # production server
npm run lint        # eslint
npm run typecheck   # tsc --noEmit
npm run test        # vitest
npm run db:migrate  # prisma migrate dev
npm run db:deploy   # prisma migrate deploy
npm run db:seed     # seed reference data and optionally demo data
npm run db:studio   # Prisma Studio
```

## How AI is used

- **Question generation** chunks processed source documents, then asks the configured Groq
  model for structured JSON drafts. Drafts are queued through the job table and enter the
  review queue; nothing is auto-approved.
- **Study assistant** retrieves the most relevant chunks for the student's subject, sends
  them as untrusted sources, and requires citations. Chunks are ranked by cosine similarity
  against the stored embeddings. If no processed material exists, the request fails
  explicitly rather than guessing.
- **Interview prep** extracts text from a resume and a company JD, asks the model for a
  tailored question set, stores the questions against the user's interview kit, then scores
  each practice answer and produces an overall debrief. Resume/JD text is treated as
  untrusted input, and every endpoint is scoped to the owning user.

AI output is treated as untrusted input: generated questions require admin approval before
they can be published in an exam.

## Notes

- Exam timing is enforced by the server. Autosaved answers are stored per selection, and
  submitting or expiring finalizes the attempt.
- Interview kits accept any requested question count. Generation runs in batches of 10,
  de-duplicates questions across batches, and retries provider rate limits using the
  provider's retry hint. Requests that exceed the provider's tokens-per-minute limit take
  longer but continue automatically.
- Document processing and AI question generation jobs are drained by `/api/cron/jobs` or
  opportunistically after the related request. Interview question drafting runs in the
  upload request's `after()` hook and reports failures on the interview kit.
- Admins upload source documents and create or generate questions inside a subject's
  workspace. Generated questions always enter the review queue and are never auto-published.
- A real API key in `.env` should be rotated if it has been shared or committed.
- **Database note:** the project is now aligned on MySQL. `prisma/schema.prisma` and
  `prisma/migrations/20261118000000_init` are MySQL (embeddings are stored as JSON and
  cosine similarity is computed in app code). The earlier PostgreSQL + pgvector migration was
  archived under `archive/prisma-postgres/` for reference. Existing databases created via
  `prisma db push` must be baselined once with
  `npx prisma migrate resolve --applied 20261118000000_init`; fresh databases can use
  `npx prisma migrate deploy`.
