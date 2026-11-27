# PGCIP — Personal Growth & Career Intelligence Platform

A merged Next.js platform that combines the **Personal Growth Operating System** (PGOS) with the **Mock Exam** question bank. It runs a single shared database and a single JWT cookie (`pgcip_token`) for authentication.

## Stack

- **Framework:** Next.js 14 (App Router) + React 18 + TypeScript (strict)
- **Database:** MySQL / MariaDB via Prisma 7 (MariaDB adapter)
- **Auth:** JWT in an httpOnly cookie, verified both at the edge (middleware) and in route handlers
- **AI:** Anthropic (coach) + Groq (question generation, RAG study assistant)
- **Storage:** S3-compatible (optional) with a local filesystem fallback
- **Styling:** Tailwind CSS 3

## Quick start

```bash
# 1. Install
npm install

# 2. Configure environment
cp .env.example .env.local
# edit .env.local — at minimum set DATABASE_URL and JWT_SECRET

# 3. Database
npx prisma migrate deploy   # or `npm run db:migrate`
# (for a fresh dev DB you can also use `npx prisma db push`)

# 4. Run
npm run dev
```

Open http://localhost:3000.

## Environment variables

See `.env.example` for the full list. The required ones are:

| Variable | Purpose |
|---|---|
| `DATABASE_URL` | MySQL/MariaDB connection string |
| `JWT_SECRET` | Long random secret used to sign the `pgcip_token` cookie (no fallback) |
| `CRON_SECRET` | Secret for the `/api/cron/jobs` endpoint |

AI, storage, and embedding variables are optional; features degrade gracefully when unset.

## Scripts

| Script | Purpose |
|---|---|
| `npm run dev` | Start the dev server |
| `npm run build` | Generate the Prisma client and build for production |
| `npm run start` | Run the production build |
| `npm run lint` | ESLint |
| `npm run typecheck` | `tsc --noEmit` |
| `npm run db:migrate` | Apply pending migrations (`prisma migrate deploy`) |
| `npm run db:status` | Show migration status |

## Database migrations

The schema lives in `prisma/schema.prisma` (42 models). Migrations live in `prisma/migrations/`. A single **baseline migration** (`20261127000000_baseline`) creates the full schema; it was validated against a fresh database.

### Applying to a fresh database

```bash
npm run db:migrate
```

### Applying to the existing production database (one-time)

Production was previously repaired by hand and may contain rows in `_prisma_migrations` for the four superseded migrations. To adopt the baseline without re-running it:

```bash
# 1. Mark the baseline as already applied (does not execute its SQL).
npx prisma migrate resolve --applied 20261127000000_baseline

# 2. If rows for the old migrations exist, remove them so `migrate status` is clean.
#    Run against the production database:
#    DELETE FROM _prisma_migrations
#    WHERE migration_name IN (
#      '20260804035823_init',
#      '20260804053729_education_module',
#      '20260804090740_interview_module',
#      '20260804095610_goal_management'
#    );

# 3. Verify
npm run db:status
```

After this, future migrations apply normally with `npm run db:migrate`.

## Architecture notes

- **Shared question bank:** rows in `Question` with `userId = NULL` are shared across all users. Negative IDs in the interview API represent shared rows; positive IDs are user-owned `InterviewBankQuestion` rows.
- **Shared question delete** is a soft archive (`Question.status = 'ARCHIVED'`), admin-only, to preserve exam/attempt foreign keys.
- **Regeneration auto-saves:** negative IDs update `Question.explanation`; positive IDs update `InterviewBankQuestion.answer`.
- **Canonical questions route:** `/interview/questions`. `/question-bank` redirects there.
- **Auth:** middleware verifies the JWT at the edge for both pages and API routes. Route handlers re-validate against the DB so deactivated accounts lose access within 30 seconds.
- **Rate limiting:** DB-backed fixed-window buckets (`RateLimitBucket`), cleaned up by the daily cron.

## Deployment

- **GitHub:** `shivajitiwariint-AI/Mock-Exam`, branch `main`.
- **Vercel:** two projects share the code — `pgcip` (primary, `pgcip.vercel.app`) and `mockexam` (legacy domain, `mockexam-mu.vercel.app`). Deploy with `vercel --prod --yes` from the project directory. Auto-deploy from GitHub is not connected; manual deploys are required to avoid drift.
- Both domains share the repaired production database.

## Testing

- `npm run lint` and `npm run typecheck` for static checks.
- `scripts/smoke-test.cjs` is a 122-check end-to-end suite. Run with `node scripts/smoke-test.cjs` (optionally `SMOKE_BASE_URL=http://...`).
