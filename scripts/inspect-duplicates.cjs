/* eslint-disable */
const fs = require('fs');
const mariadb = require('mariadb');

const line = fs.readFileSync('.env.local', 'utf8').split(/\r?\n/).find((l) => l.trim().startsWith('DATABASE_URL='));
const url = line.slice(line.indexOf('=') + 1).trim().replace(/^"|"$/g, '');
const parsed = new URL(url);

(async () => {
  const connection = await mariadb.createConnection({
    host: parsed.hostname,
    port: Number(parsed.port || 3306),
    user: decodeURIComponent(parsed.username),
    password: decodeURIComponent(parsed.password),
    database: decodeURIComponent(parsed.pathname.slice(1)),
  });

  const exact = await connection.query(
    'SELECT questionText, COUNT(*) AS n FROM questions GROUP BY questionText HAVING n > 1 ORDER BY n DESC LIMIT 20',
  );
  console.log('EXACT duplicate questionText groups:', exact.length);
  exact.forEach((r) => console.log(' ', r.n, r.questionText.slice(0, 90)));

  const subjects = await connection.query(
    'SELECT slug, name, COUNT(*) AS n FROM subjects GROUP BY slug, name HAVING n > 1',
  );
  console.log('Duplicate subjects:', subjects.length);

  const topics = await connection.query(
    'SELECT subjectId, name, COUNT(*) AS n FROM topics GROUP BY subjectId, name HAVING n > 1 ORDER BY n DESC LIMIT 20',
  );
  console.log('Duplicate topics:', topics.length);
  topics.forEach((r) => console.log(' ', r.n, r.name.slice(0, 80)));

  const hashes = await connection.query(
    'SELECT contentHash, COUNT(*) AS n FROM questions WHERE contentHash IS NOT NULL GROUP BY contentHash HAVING n > 1 LIMIT 20',
  );
  console.log('Duplicate contentHashes:', hashes.length);

  const prefixes = await connection.query(
    'SELECT LEFT(questionText, 60) AS k, COUNT(*) AS n FROM questions GROUP BY k HAVING n > 1 ORDER BY n DESC LIMIT 20',
  );
  console.log('Duplicate first-60-char prefixes:', prefixes.length);
  prefixes.forEach((r) => console.log(' ', r.n, r.k));

  const perSubject = await connection.query(
    `SELECT s.name AS subject, COUNT(*) AS n
       FROM questions q JOIN subjects s ON s.id = q.subjectId
      GROUP BY s.id, s.name ORDER BY n DESC`,
  );
  console.log('\nQuestions per subject:');
  perSubject.forEach((r) => console.log(' ', r.subject, r.n));

  await connection.end();
})().catch((error) => {
  console.error(error);
  process.exit(1);
});
