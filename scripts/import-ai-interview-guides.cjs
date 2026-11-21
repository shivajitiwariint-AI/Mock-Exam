/* eslint-disable */
/**
 * Imports the extracted AI-Interview answer guides into the shared question
 * bank so they appear on /interview/questions for every account.
 *
 * Layout:
 *   subject = role / guide name (for example "Full Stack Specialist")
 *   topic   = section inside that guide (for example "React")
 *
 * Idempotent: rows are keyed by a SHA-256 content hash.
 */
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const mariadb = require('mariadb');

const INPUT_FILE = path.resolve('scripts/data/ai-interview-guide.json');

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
  return String(value ?? '').replace(/\s+/g, ' ').trim().toLowerCase();
}

function slugify(value) {
  return String(value)
    .toLowerCase()
    .replace(/&/g, ' and ')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 110);
}

function hashQuestion(question) {
  return crypto.createHash('sha256').update(normalize(question)).digest('hex');
}

/** Reworded duplicates ("A and B" vs "B and A") should not be re-imported. */
function dedupeKey(question) {
  return normalize(question).split(' ').filter(Boolean).sort().join(' ');
}

function cleanTopic(topic, category) {
  const value = String(topic ?? '').replace(/\s+/g, ' ').trim();
  if (!value) return 'General';
  if (/^\d+[\.\)]/.test(value) || value.startsWith('•') || value.length > 100) return 'General';
  return value;
}

function inferDifficulty(question, answer) {
  const text = `${question} ${answer}`.toLowerCase();
  if (/design |design$|architecture|from scratch|scalab|trade-?off|enterprise|high availability|multi-agent/.test(text)) return 'HARD';
  if (/^what is|^when should|^why |difference between|^explain /.test(question.toLowerCase())) return 'EASY';
  return 'MEDIUM';
}

async function main() {
  const databaseUrl = getVar('.env.local', 'DATABASE_URL');
  if (!databaseUrl) throw new Error('DATABASE_URL not found in .env.local');
  if (!fs.existsSync(INPUT_FILE)) throw new Error(`Missing ${INPUT_FILE}`);

  const items = JSON.parse(fs.readFileSync(INPUT_FILE, 'utf8'));
  if (!Array.isArray(items) || items.length === 0) throw new Error('No guide questions found');

  const connection = await mariadb.createConnection(config(databaseUrl));
  try {
    const subjectRows = await connection.query(
      "SELECT id, name FROM subjects WHERE slug LIKE 'guide-%'",
    );
    const subjectIds = new Map(subjectRows.map((row) => [row.name, row.id]));

    const topicRows = await connection.query('SELECT id, subjectId, name FROM topics');
    const topicIds = new Map(topicRows.map((row) => [`${row.subjectId}\u0000${row.name}`, row.id]));

    const existingRows = await connection.query(
      `SELECT q.contentHash, q.questionText
         FROM questions q
         JOIN subjects s ON s.id = q.subjectId
        WHERE s.slug LIKE 'guide-%'`,
    );
    const existingHashes = new Set(existingRows.map((row) => row.contentHash).filter(Boolean));
    const existingKeys = new Set(existingRows.map((row) => dedupeKey(row.questionText)).filter(Boolean));

    const ensureSubject = async (name) => {
      if (subjectIds.has(name)) return subjectIds.get(name);
      const slug = `guide-${slugify(name)}`;
      const result = await connection.query(
        `INSERT INTO subjects
           (userId, name, slug, description, status, color, icon, createdAt, updatedAt)
         VALUES
           (NULL, ?, ?, ?, 'ACTIVE', '#8B5CF6', '🎤', NOW(), NOW())`,
        [name, slug, `Interview questions and answers for ${name}.`],
      );
      const id = Number(result.insertId);
      subjectIds.set(name, id);
      console.log(`Created subject ${name}`);
      return id;
    };

    const ensureTopic = async (subjectId, name) => {
      const key = `${subjectId}\u0000${name}`;
      if (topicIds.has(key)) return topicIds.get(key);
      const result = await connection.query(
        'INSERT INTO topics (subjectId, name, description, `order`, createdAt, updatedAt) VALUES (?, ?, ?, 0, NOW(), NOW())',
        [subjectId, name, `${name} questions.`],
      );
      const id = Number(result.insertId);
      topicIds.set(key, id);
      return id;
    };

    let inserted = 0;
    let skipped = 0;
    const seen = new Set();
    for (let index = 0; index < items.length; index += 1) {
      const item = items[index];
      const question = String(item.question ?? '').replace(/\s+/g, ' ').trim();
      const answer = String(item.answer ?? '').trim();
      if (!question || !answer) {
        skipped += 1;
        continue;
      }

      const contentHash = hashQuestion(question);
      const key = dedupeKey(question);
      if (existingHashes.has(contentHash) || existingKeys.has(key) || seen.has(key)) {
        skipped += 1;
        continue;
      }
      seen.add(key);

      const category = String(item.category || 'General').trim();
      const topicName = cleanTopic(item.topic, category);
      const subjectId = await ensureSubject(category);
      const topicId = await ensureTopic(subjectId, topicName);
      const difficulty = inferDifficulty(question, answer);

      await connection.query(
        `INSERT INTO questions
           (subjectId, topicId, subtopicId, userId, sourceDocumentId, sourceChunkId,
            type, questionText, options, correctOption, explanation, difficulty,
            status, source, contentHash, aiModel, reviewedById, reviewedAt, createdAt, updatedAt)
         VALUES
           (?, ?, NULL, NULL, NULL, NULL,
            'SUBJECTIVE', ?, NULL, NULL, ?, ?,
            'APPROVED', 'IMPORTED', ?, 'ai-interview-guide', NULL, NOW(), NOW(), NOW())`,
        [subjectId, topicId, question, answer, difficulty, contentHash],
      );
      inserted += 1;
      if ((index + 1) % 250 === 0) console.log(`Processed ${index + 1}/${items.length}`);
    }

    console.log(`Done: ${inserted} inserted, ${skipped} skipped (already present or invalid).`);
  } finally {
    await connection.end();
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
