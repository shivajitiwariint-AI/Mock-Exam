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

  const prefixes = await connection.query(
    'SELECT LEFT(questionText, 60) AS k FROM questions GROUP BY k HAVING COUNT(*) > 1',
  );
  for (const prefix of prefixes) {
    const rows = await connection.query(
      `SELECT q.id, q.questionText, q.explanation, s.name AS subject, t.name AS topic
         FROM questions q
         JOIN subjects s ON s.id = q.subjectId
         LEFT JOIN topics t ON t.id = q.topicId
        WHERE LEFT(q.questionText, 60) = ?
        ORDER BY q.id`,
      [prefix.k],
    );
    console.log('\n=== GROUP ===');
    for (const row of rows) {
      console.log(`#${row.id} [${row.subject} / ${row.topic}]`);
      console.log(`  Q: ${row.questionText}`);
      console.log(`  A: ${String(row.explanation ?? '').slice(0, 300)}`);
    }
  }
  await connection.end();
})().catch((error) => {
  console.error(error);
  process.exit(1);
});
