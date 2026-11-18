<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

## Persistent project decisions

- Never reset or delete real user/study data. Clean up only clearly test or stale artifacts.
- Study-material upload auto-generation creates **all SUBJECTIVE questions related to the selected topic** (batched across all document chunks, deduplicated): `options: []`, `correctOption: null`, and the model answer in `explanation`.
- Generated questions must stay strictly within the **selected topic**. Retrieval is scoped to the uploaded document and ranked against that topic.
- A future UI should let admins choose the generated question type; keep the generation backend's optional `questionType` support.
- Upload UI: **Topic** and **Study file** fields stay stacked vertically, with upload percentage and question-generation percentage visible.
- Admins can permanently delete unused questions. Questions already used in exams must be archived instead.
- Admin dashboard numbers must match the real database. Remove `test-*` users, test subjects, exams, and attempts after running tests.
- Exams and automatic scoring are **MCQ-only**. Subjective questions must not be selectable for exams.
- Students can browse the **Question bank** (`/question-bank`) filtered by active subject and topic. It shows only `APPROVED` questions and includes the correct option or model answer.
- Keep `Question.questionText` and `Question.explanation` as MySQL `TEXT` columns; default `VARCHAR(191)` truncates model answers.
- This model cannot view attached screenshots; ask for a textual description when visual details matter.
