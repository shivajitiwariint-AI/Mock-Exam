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
async function main() {
  const target = await mariadb.createConnection(config(getVar('.env.local', 'DATABASE_URL')));
  const source = await mariadb.createConnection(config(getVar('E:/Mock Exam/mock-exam-platform/.env', 'DATABASE_URL')));
  const t = (await target.query("SELECT id, password FROM user WHERE email='shivajitiwari@gmail.com'"))[0];
  const s = (await source.query("SELECT id, passwordHash FROM users WHERE email='shivajitiwari@gmail.com'"))[0];
  console.log('target hash:', t.password);
  console.log('source hash:', s.passwordHash);
  console.log('identical:', t.password === s.passwordHash);
  await target.end(); await source.end();
}
main().catch(e => { console.error(e); process.exit(1); });
