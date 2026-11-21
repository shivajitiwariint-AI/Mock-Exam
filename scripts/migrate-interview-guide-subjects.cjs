/* eslint-disable */
/**
 * Restructures imported AI-Interview guide questions:
 *   old: one subject "Interview Answer Guides", topics = role names
 *   new: one subject per role, topics = guide sections stored in the answer
 */
const fs = require('fs');
const mariadb = require('mariadb');

const OLD_SUBJECT_SLUG = 'interview-answer-guides';
const TOPIC_MARKER = '\n\nTopic: ';

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

function slugify(value) {
  return String(value)
    .toLowerCase()
    .replace(/&/g, ' and ')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 110);
}

function splitAnswer(explanation) {
  const text = String(explanation ?? '');
  const index = text.lastIndexOf(TOPIC_MARKER);
  if (index < 0) return { answer: text, topic: 'General' };
  return {
    answer: text.slice(0, index).trim(),
    topic: text.slice(index + TOPIC_MARKER.length).trim() || 'General',
  };
}

async function main() {
  const databaseUrl = getVar('.env.local', 'DATABASE_URL');
  if (!databaseUrl) throw new Error('DATABASE_URL not found in .env.local');
  const connection = await mariadb.createConnection(config(databaseUrl));

  try {
    await connection.beginTransaction();
    const oldSubjectRows = await connection.query(
      'SELECT id, name FROM subjects WHERE slug = ? LIMIT 1',
      [OLD_SUBJECT_SLUG],
    );
    const oldSubject = oldSubjectRows[0];
    if (!oldSubject) {
      console.log('Old guide subject not found; nothing to migrate.');
      await connection.rollback();
      return;
    }

    const oldTopics = await connection.query('SELECT id, name FROM topics WHERE subjectId = ?', [oldSubject.id]);
    const roleTopicIds = new Map(oldTopics.map((topic) => [topic.name, topic.id]));

    const questions = await connection.query(
      `SELECT id, topicId, questionText, explanation
         FROM questions
        WHERE subjectId = ? AND source = 'IMPORTED'`,
      [oldSubject.id],
    );
    console.log(`Found ${questions.length} guide questions to restructure.`);

    const subjectIds = new Map();
    for (const roleName of roleTopicIds.keys()) {
      const slug = `guide-${slugify(roleName)}`;
      const existing = await connection.query('SELECT id FROM subjects WHERE slug = ? LIMIT 1', [slug]);
      if (existing[0]) {
        subjectIds.set(roleName, existing[0].id);
        continue;
      }
      const result = await connection.query(
        `INSERT INTO subjects
           (userId, name, slug, description, status, color, icon, createdAt, updatedAt)
         VALUES
           (NULL, ?, ?, ?, 'ACTIVE', '#8B5CF6', '🎤', NOW(), NOW())`,
        [roleName, slug, `Interview questions and answers for ${roleName}.`],
      );
      subjectIds.set(roleName, Number(result.insertId));
      console.log(`Created subject ${roleName}`);
    }

    const topicIds = new Map();
    const ensureTopic = async (roleName, topicName) => {
      const key = `${roleName}\u0000${topicName}`;
      if (topicIds.has(key)) return topicIds.get(key);
      const subjectId = subjectIds.get(roleName);
      const existing = await connection.query(
        'SELECT id FROM topics WHERE subjectId = ? AND name = ? LIMIT 1',
        [subjectId, topicName],
      );
      if (existing[0]) {
        topicIds.set(key, existing[0].id);
        return existing[0].id;
      }
      const result = await connection.query(
        'INSERT INTO topics (subjectId, name, description, `order`, createdAt, updatedAt) VALUES (?, ?, ?, 0, NOW(), NOW())',
        [subjectId, topicName, `${topicName} questions for ${roleName}.`],
      );
      const id = Number(result.insertId);
      topicIds.set(key, id);
      return id;
    };

    let updated = 0;
    for (const question of questions) {
      const oldTopic = oldTopics.find((topic) => topic.id === question.topicId);
      const roleName = oldTopic?.name ?? 'General';
      if (!subjectIds.has(roleName)) {
        const slug = `guide-${slugify(roleName)}`;
        const result = await connection.query(
          `INSERT INTO subjects
             (userId, name, slug, description, status, color, icon, createdAt, updatedAt)
           VALUES
             (NULL, ?, ?, ?, 'ACTIVE', '#8B5CF6', '🎤', NOW(), NOW())`,
          [roleName, slug, `Interview questions and answers for ${roleName}.`],
        );
        subjectIds.set(roleName, Number(result.insertId));
      }
      const { answer, topic } = splitAnswer(question.explanation);
      const topicId = await ensureTopic(roleName, topic);
      await connection.query(
        'UPDATE questions SET subjectId = ?, topicId = ?, explanation = ?, updatedAt = NOW() WHERE id = ?',
        [subjectIds.get(roleName), topicId, answer, question.id],
      );
      updated += 1;
    }

    const remaining = await connection.query(
      'SELECT COUNT(*) AS count FROM questions WHERE subjectId = ?',
      [oldSubject.id],
    );
    if (Number(remaining[0]?.count ?? 0) === 0) {
      await connection.query('DELETE FROM subjects WHERE id = ?', [oldSubject.id]);
      console.log(`Removed old subject ${oldSubject.name}`);
    }

    await connection.commit();
    console.log(`Done: ${updated} questions restructured.`);
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    await connection.end();
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
