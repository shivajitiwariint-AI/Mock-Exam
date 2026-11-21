/* eslint-disable */
const fs = require('fs');
const mariadb = require('mariadb');

const line = fs.readFileSync('.env.local', 'utf8').split(/\r?\n/).find((l) => l.trim().startsWith('DATABASE_URL='));
const url = line.slice(line.indexOf('=') + 1).trim().replace(/^"|"$/g, '');
const parsed = new URL(url);

function normalize(value) {
  return String(value ?? '')
    .toLowerCase()
    .replace(/\s*\((recap|revisited|review)\)\s*$/g, '')
    .replace(/[^\p{L}\p{N}]+/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function tokens(text) {
  return new Set(normalize(text).split(' ').filter(Boolean));
}

function jaccard(a, b) {
  const intersection = [...a].filter((token) => b.has(token)).length;
  const union = new Set([...a, ...b]).size;
  return union === 0 ? 0 : intersection / union;
}

(async () => {
  const connection = await mariadb.createConnection({
    host: parsed.hostname,
    port: Number(parsed.port || 3306),
    user: decodeURIComponent(parsed.username),
    password: decodeURIComponent(parsed.password),
    database: decodeURIComponent(parsed.pathname.slice(1)),
  });
  const rows = await connection.query('SELECT id, questionText FROM questions');
  const normalized = rows.map((row) => ({ ...row, tokens: tokens(row.questionText) }));

  for (const threshold of [0.95, 0.9, 0.85, 0.8]) {
    const pairs = [];
    for (let i = 0; i < normalized.length; i += 1) {
      for (let j = i + 1; j < normalized.length; j += 1) {
        const a = normalized[i];
        const b = normalized[j];
        if (a.tokens.size < 4 || b.tokens.size < 4) continue;
        const score = jaccard(a.tokens, b.tokens);
        if (score >= threshold) pairs.push({ score, a, b });
      }
    }
    console.log(`\n=== Threshold ${threshold}: ${pairs.length} pairs ===`);
    pairs.sort((x, y) => y.score - x.score);
    pairs.slice(0, 15).forEach(({ score, a, b }) => {
      console.log(`${score.toFixed(3)} #${a.id} | ${a.questionText.slice(0, 80)}`);
      console.log(`           #${b.id} | ${b.questionText.slice(0, 80)}`);
    });
  }
  await connection.end();
})().catch((error) => {
  console.error(error);
  process.exit(1);
});
