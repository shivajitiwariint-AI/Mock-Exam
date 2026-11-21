/* eslint-disable */
/**
 * Removes duplicate interview questions from both question stores:
 *   1. questions           (shared import bank shown to every account)
 *   2. interview_questions (each user's own interview questions)
 *
 * Run with --apply to actually delete. By default it only reports duplicates.
 *
 * Matching catches reworded duplicates such as:
 *   "What is the difference between a chatbot and an AI agent?"
 *   "What is the difference between an AI agent and a chatbot?"
 *   "What is checkpointing in agent workflows?"
 *   "What is checkpointing in agent workflows? (recap)"
 *
 * A guard keeps genuinely different reversal pairs such as
 * "Can MCP work without LangChain?" vs "Can LangChain work without MCP?".
 *
 * The keeper in each duplicate group is chosen as:
 *   - a question referenced by an exam (never break a published exam),
 *   - then the longest answer/explanation,
 *   - then the approved row,
 *   - then the oldest id.
 */
const fs = require('fs');
const mariadb = require('mariadb');

const APPLY = process.argv.includes('--apply');

const STOPWORDS = new Set([
  'a', 'an', 'the', 'is', 'are', 'do', 'does', 'can', 'of', 'or', 'and', 'to', 'in',
  'with', 'between', 'what', 'how', 'why', 'when', 'should', 'would', 'you', 'your',
  'for', 'on', 'at', 'as', 'be', 'it', 'that', 'this', 'work',
]);

function getVar(filePath, key) {
  const text = fs.readFileSync(filePath, 'utf8');
  for (const line of text.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed.startsWith(`${key}=`)) continue;
    let value = trimmed.slice(key.length + 1).trim();
    if (value.startsWith('"') && value.endsWith('"')) value = value.slice(1, -1);
    return value;
  }
  return null;
}

function config(url) {
  const parsed = new URL(url);
  return {
    host: parsed.hostname,
    port: Number(parsed.port || 3306),
    user: decodeURIComponent(parsed.username),
    password: decodeURIComponent(parsed.password),
    database: decodeURIComponent(parsed.pathname.slice(1)),
    connectTimeout: 30000,
  };
}

function normalize(value) {
  return String(value ?? '')
    .toLowerCase()
    .replace(/\s*\((recap|revisited|review)\)\s*$/g, '')
    .replace(/[^\p{L}\p{N}]+/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function dedupeKey(value) {
  return normalize(value).split(' ').filter(Boolean).sort().join(' ');
}

function sameSet(a, b) {
  return a.length === b.length && a.every((value) => b.includes(value));
}

/** Detect "X without Y" vs "Y without X" — same words, different meaning. */
function isSwappedWithout(a, b) {
  const tokensA = normalize(a).split(' ');
  const tokensB = normalize(b).split(' ');
  const indexA = tokensA.indexOf('without');
  const indexB = tokensB.indexOf('without');
  if (indexA < 0 || indexB < 0) return false;
  const content = (tokens) => tokens.filter((token) => token && !STOPWORDS.has(token));
  const beforeA = content(tokensA.slice(0, indexA));
  const afterA = content(tokensA.slice(indexA + 1));
  const beforeB = content(tokensB.slice(0, indexB));
  const afterB = content(tokensB.slice(indexB + 1));
  return sameSet(beforeA, afterB) && sameSet(afterA, beforeB) && !sameSet(beforeA, beforeB);
}

function duplicateClusters(rows, textKey) {
  const byKey = new Map();
  for (const row of rows) {
    const key = dedupeKey(row[textKey]);
    if (!key) continue;
    const list = byKey.get(key) ?? [];
    list.push(row);
    byKey.set(key, list);
  }

  const clusters = [];
  for (const items of byKey.values()) {
    if (items.length < 2) continue;
    const groups = [];
    for (const item of items) {
      const match = groups.find((group) => !isSwappedWithout(group[0][textKey], item[textKey]));
      if (match) match.push(item);
      else groups.push([item]);
    }
    clusters.push(...groups.filter((group) => group.length > 1));
  }
  return clusters;
}

function hasRecap(value) {
  return /\((recap|revisited|review)\)\s*$/i.test(String(value ?? ''));
}

function rankKeeper(items, answerKey, referencedIds) {
  return [...items].sort((a, b) => {
    const refA = referencedIds?.has(Number(a.id)) ? 1 : 0;
    const refB = referencedIds?.has(Number(b.id)) ? 1 : 0;
    if (refA !== refB) return refB - refA;
    if (hasRecap(a.questionText ?? a.question) !== hasRecap(b.questionText ?? b.question)) {
      return hasRecap(a.questionText ?? a.question) ? 1 : -1;
    }
    const lenA = String(a[answerKey] ?? '').length;
    const lenB = String(b[answerKey] ?? '').length;
    if (lenA !== lenB) return lenB - lenA;
    if (a.status === 'APPROVED' && b.status !== 'APPROVED') return -1;
    if (b.status === 'APPROVED' && a.status !== 'APPROVED') return 1;
    if (Boolean(a.practiced) !== Boolean(b.practiced)) return a.practiced ? -1 : 1;
    return Number(a.id) - Number(b.id);
  });
}

/** Keep the longest answer from the whole cluster on the chosen keeper row. */
function bestAnswer(cluster, answerKey) {
  return cluster.reduce((best, item) =>
    String(item[answerKey] ?? '').length > String(best[answerKey] ?? '').length ? item : best,
  );
}

async function main() {
  const databaseUrl = getVar('.env.local', 'DATABASE_URL');
  if (!databaseUrl) throw new Error('DATABASE_URL not found in .env.local');
  const connection = await mariadb.createConnection(config(databaseUrl));

  try {
    // ── Shared questions table ────────────────────────────────────────────────
    const examRefs = await connection.query('SELECT DISTINCT questionId FROM exam_questions');
    const examRefIds = new Set(examRefs.map((row) => Number(row.questionId)));

    const attemptRefs = await connection.query(
      'SELECT DISTINCT questionId FROM exam_attempt_questions WHERE questionId IS NOT NULL',
    );
    const attemptRefIds = new Set(attemptRefs.map((row) => Number(row.questionId)));

    const questions = await connection.query(
      `SELECT id, questionText, explanation, status, source, subjectId, contentHash, createdAt
         FROM questions`,
    );
    const bankClusters = duplicateClusters(questions, 'questionText');
    let bankDeleted = 0;

    for (const cluster of bankClusters) {
      const ranked = rankKeeper(cluster, 'explanation', examRefIds);
      const keeper = ranked[0];
      const sourceAnswer = bestAnswer(cluster, 'explanation');
      if (Number(sourceAnswer.id) !== Number(keeper.id)) {
        console.log(`  enrich #${keeper.id} with the fuller answer from #${sourceAnswer.id}`);
        if (APPLY) {
          await connection.query(
            'UPDATE questions SET explanation = ?, updatedAt = NOW() WHERE id = ?',
            [sourceAnswer.explanation, Number(keeper.id)],
          );
        }
      }
      console.log(`\n[shared] keep #${keeper.id}: ${String(keeper.questionText).slice(0, 90)}`);
      for (const dup of ranked.slice(1)) {
        const dupId = Number(dup.id);
        const keeperId = Number(keeper.id);
        console.log(`  remove #${dupId}: ${String(dup.questionText).slice(0, 90)}`);
        if (attemptRefIds.has(dupId)) {
          await connection.query(
            'UPDATE exam_attempt_questions SET questionId = ? WHERE questionId = ?',
            [keeperId, dupId],
          );
        }
        if (examRefIds.has(dupId)) {
          await connection.query(
            `DELETE eq FROM exam_questions eq
              WHERE eq.questionId = ?
                AND EXISTS (SELECT 1 FROM exam_questions keep WHERE keep.examId = eq.examId AND keep.questionId = ?)`,
            [dupId, keeperId],
          );
          await connection.query(
            'UPDATE exam_questions SET questionId = ? WHERE questionId = ?',
            [keeperId, dupId],
          );
        }
        if (APPLY) await connection.query('DELETE FROM questions WHERE id = ?', [dupId]);
        bankDeleted += 1;
      }
    }

    // ── Per-user interview questions ──────────────────────────────────────────
    const interviewQuestions = await connection.query(
      `SELECT id, userId, question, answer, practiced, source, category, createdAt
         FROM interview_questions`,
    );
    const interviewClusters = duplicateClusters(interviewQuestions, 'question');
    let interviewDeleted = 0;
    for (const cluster of interviewClusters) {
      const ranked = rankKeeper(cluster, 'answer', null);
      const keeper = ranked[0];
      const sourceAnswer = bestAnswer(cluster, 'answer');
      if (Number(sourceAnswer.id) !== Number(keeper.id) && APPLY) {
        await connection.query(
          'UPDATE interview_questions SET answer = ?, updatedAt = NOW() WHERE id = ?',
          [sourceAnswer.answer, Number(keeper.id)],
        );
      }
      for (const dup of ranked.slice(1)) {
        if (APPLY) await connection.query('DELETE FROM interview_questions WHERE id = ?', [Number(dup.id)]);
        interviewDeleted += 1;
      }
    }

    console.log(`\n${APPLY ? 'APPLIED' : 'DRY RUN'} — shared questions:`);
    console.log(`  ${bankClusters.length} duplicate groups, ${bankDeleted} rows to remove`);
    console.log(`${APPLY ? 'APPLIED' : 'DRY RUN'} — user interview questions:`);
    console.log(`  ${interviewClusters.length} duplicate groups, ${interviewDeleted} rows to remove`);
    if (!APPLY) console.log('\nRe-run with --apply to delete the duplicates.');

    const remaining = await connection.query('SELECT COUNT(*) AS count FROM questions');
    const remainingInterview = await connection.query('SELECT COUNT(*) AS count FROM interview_questions');
    console.log(`\nShared questions now: ${remaining[0].count}`);
    console.log(`Interview questions now: ${remainingInterview[0].count}`);
  } finally {
    await connection.end();
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
