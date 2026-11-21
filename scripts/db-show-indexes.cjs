/* eslint-disable */
const fs = require('fs');
const mariadb = require('mariadb');

function getVar(filePath, key) {
  for (const line of fs.readFileSync(filePath, 'utf8').split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed.startsWith(`${key}=`)) continue;
    let value = trimmed.slice(key.length + 1).trim();
    if (value.startsWith('"') && value.endsWith('"')) value = value.slice(1, -1);
    return value;
  }
  return null;
}
function config(url) {
  const p = new URL(url);
  return { host: p.hostname, port: Number(p.port || 3306), user: decodeURIComponent(p.username), password: decodeURIComponent(p.password), database: decodeURIComponent(p.pathname.slice(1)), connectTimeout: 30000 };
}

async function main() {
  const cfg = config(getVar('.env.local', 'DATABASE_URL'));
  const conn = await mariadb.createConnection(cfg);
  const tables = await conn.query('SELECT TABLE_NAME AS name FROM information_schema.TABLES WHERE TABLE_SCHEMA=? ORDER BY TABLE_NAME', [cfg.database]);
  console.log('TABLES:', tables.map(t => t.name).join(', '));
  for (const table of ['exam_questions','user','users','attempt_results','exam_attempts']) {
    const indexes = await conn.query(`SHOW INDEX FROM \`${cfg.database}\`.\`${table}\``).catch(() => []);
    const create = await conn.query(`SHOW CREATE TABLE \`${cfg.database}\`.\`${table}\``).catch(() => [{ 'Create Table': null }]);
    console.log(`\n-- ${table}`);
    console.log('indexes:', indexes.map(i => `${i.Key_name}(${i.Column_name})`).join(', ') || '(none)');
    if (create[0] && create[0]['Create Table']) console.log(create[0]['Create Table']);
  }
  await conn.end();
}
main().catch(e => { console.error(e); process.exit(1); });
