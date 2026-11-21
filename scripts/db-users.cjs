/* eslint-disable */
const fs = require('fs');
const mariadb = require('mariadb');
function getVar(filePath, key) {
  for (const line of fs.readFileSync(filePath, 'utf8').split(/\r?\n/)) {
    const t = line.trim();
    if (!t.startsWith(`${key}=`)) continue;
    let v = t.slice(key.length + 1).trim();
    if (v.startsWith('"') && v.endsWith('"')) v = v.slice(1, -1);
    return v;
  }
  return null;
}
function config(url) {
  const p = new URL(url);
  return { host: p.hostname, port: Number(p.port || 3306), user: decodeURIComponent(p.username), password: decodeURIComponent(p.password), database: decodeURIComponent(p.pathname.slice(1)), ssl: p.searchParams.has('sslaccept') ? { rejectUnauthorized: false } : undefined, connectTimeout: 30000 };
}
async function show(label, filePath, sql) {
  const conn = await mariadb.createConnection(config(getVar(filePath, 'DATABASE_URL')));
  const rows = await conn.query(sql);
  console.log(`\n=== ${label} ===`);
  console.log(JSON.stringify(rows.map(r => Object.fromEntries(Object.entries(r).map(([k, v]) => [k, typeof v === 'string' && v.length > 80 ? v.slice(0, 80) + '...' : v]))), null, 2));
  await conn.end();
}
async function main() {
  await show('TARGET users', '.env.local', 'SELECT id, email, name, role, status, isAdmin, createdAt FROM user ORDER BY id');
  await show('SOURCE users', 'E:/Mock Exam/mock-exam-platform/.env', 'SELECT id, email, name, role, status, lastLoginAt, createdAt FROM users ORDER BY id');
}
main().catch(e => { console.error(e); process.exit(1); });
