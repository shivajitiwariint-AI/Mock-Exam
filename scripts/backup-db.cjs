/* eslint-disable */
/**
 * Lightweight MySQL/MariaDB logical backup. Produces a .sql file containing
 * CREATE TABLE and INSERT statements for every table in the configured DB.
 */
const fs = require('fs');
const path = require('path');
const mariadb = require('mariadb');

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
    ssl: parsed.searchParams.has('sslaccept') ? { rejectUnauthorized: false } : undefined,
    connectTimeout: 30000,
    multipleStatements: false,
  };
}

function quote(value) {
  if (value === null || value === undefined) return 'NULL';
  if (value instanceof Date) return `'${value.toISOString().slice(0, 23).replace('T', ' ')}'`;
  if (Buffer.isBuffer(value)) return `X'${value.toString('hex')}'`;
  if (typeof value === 'boolean') return value ? '1' : '0';
  if (typeof value === 'number' || typeof value === 'bigint') return String(value);
  if (typeof value === 'object') return `'${JSON.stringify(value).replace(/\\/g, '\\\\').replace(/'/g, "\\'")}'`;
  return `'${String(value).replace(/\\/g, '\\\\').replace(/'/g, "\\'").replace(/\n/g, '\\n').replace(/\r/g, '\\r')}'`;
}

async function dump(label, url, outputDir) {
  const cfg = config(url);
  const connection = await mariadb.createConnection(cfg);
  const tableRows = await connection.query(
    'SELECT TABLE_NAME AS name FROM information_schema.TABLES WHERE TABLE_SCHEMA = ? ORDER BY TABLE_NAME',
    [cfg.database],
  );
  const tables = tableRows.map((row) => row.name);

  const stamp = new Date().toISOString().replace(/[:.]/g, '-');
  const fileName = `${label}-${stamp}.sql`;
  const filePath = path.join(outputDir, fileName);
  const stream = fs.createWriteStream(filePath, { encoding: 'utf8' });

  stream.write(`-- Logical backup of ${cfg.database}\n`);
  stream.write(`-- Created: ${new Date().toISOString()}\n`);
  stream.write('SET FOREIGN_KEY_CHECKS=0;\n\n');

  for (const table of tables) {
    const createRows = await connection.query(`SHOW CREATE TABLE \`${cfg.database}\`.\`${table}\``);
    const createSql = Object.values(createRows[0]).find((value) => typeof value === 'string' && value.startsWith('CREATE TABLE'));
    stream.write(`DROP TABLE IF EXISTS \`${table}\`;\n${createSql};\n`);

    const rows = await connection.query(`SELECT * FROM \`${cfg.database}\`.\`${table}\``);
    if (rows.length > 0) {
      const columns = Object.keys(rows[0]);
      const columnList = columns.map((column) => `\`${column}\``).join(', ');
      stream.write(`INSERT INTO \`${table}\` (${columnList}) VALUES\n`);
      const values = rows.map((row) => `  (${columns.map((column) => quote(row[column])).join(', ')})`).join(',\n');
      stream.write(`${values};\n`);
    }
    stream.write(`\n-- ${table}: ${rows.length} rows\n\n`);
  }

  stream.write('SET FOREIGN_KEY_CHECKS=1;\n');
  await new Promise((resolve, reject) => { stream.end(resolve); stream.on('error', reject); });
  await connection.end();

  console.log(`${label}: backed up ${tables.length} tables to ${filePath}`);
  return filePath;
}

async function main() {
  const outputDir = path.resolve('backups');
  fs.mkdirSync(outputDir, { recursive: true });
  await dump('pgcip_db', getVar('.env.local', 'DATABASE_URL'), outputDir);
  const sourceEnv = 'E:/Mock Exam/mock-exam-platform/.env';
  if (fs.existsSync(sourceEnv)) {
    await dump('mock_exam', getVar(sourceEnv, 'DATABASE_URL'), outputDir);
  } else {
    console.log('mock_exam: skipped (old Mock Exam project directory no longer exists)');
  }
}

main().catch((error) => { console.error(error); process.exit(1); });
