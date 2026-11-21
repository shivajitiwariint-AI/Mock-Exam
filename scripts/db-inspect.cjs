/* eslint-disable */
const fs = require('fs');
const mariadb = require('mariadb');

function getVar(path, key) {
  const text = fs.readFileSync(path, 'utf8');
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
    ssl: parsed.searchParams.has('sslaccept') ? { rejectUnauthorized: false } : undefined,
    connectTimeout: 30000,
  };
}

async function inspect(name, url, tables) {
  const cfg = config(url);
  const connection = await mariadb.createConnection(cfg);
  console.log(`\n=== ${name} (${cfg.database}) ===`);
  const rows = await connection.query('SELECT TABLE_NAME AS name FROM information_schema.TABLES WHERE TABLE_SCHEMA = ? ORDER BY TABLE_NAME', [cfg.database]);
  const actualTables = rows.map((r) => r.name);
  console.log('tables:', actualTables.join(', '));

  for (const table of tables) {
    if (!actualTables.includes(table)) { console.log(`\n-- ${table}: MISSING`); continue; }
    const columns = await connection.query(`SHOW COLUMNS FROM \`${cfg.database}\`.\`${table}\``);
    const count = await connection.query(`SELECT COUNT(*) AS n FROM \`${cfg.database}\`.\`${table}\``);
    console.log(`\n-- ${table} (${count[0].n} rows)`);
    console.log(columns.map((c) => `${c.Field}:${c.Type}${c.Null === 'NO' ? '!' : ''}`).join(', '));
  }
  await connection.end();
}

async function main() {
  const targetUrl = getVar('.env.local', 'DATABASE_URL');
  const sourceUrl = getVar('E:/Mock Exam/mock-exam-platform/.env', 'DATABASE_URL');

  await inspect('TARGET', targetUrl, ['user', 'users', 'userprofile', 'user_profiles', 'activitylog', 'activity_logs', 'notification', 'notifications']);
  await inspect('SOURCE', sourceUrl, ['users', 'subjects', 'subject_admins', 'topics', 'documents', 'document_chunks', 'questions', 'exam_questions', 'exams', 'exam_attempts', 'exam_attempt_questions', 'student_answers', 'exam_results', 'audit_logs', 'processing_jobs', 'rate_limit_buckets', 'interview_preps', 'interview_questions', 'interview_sessions', 'interview_proctor_events', 'interview_session_questions', 'interview_answers']);
}

main().catch((error) => { console.error(error); process.exit(1); });
