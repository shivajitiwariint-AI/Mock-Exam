/* eslint-disable */
const fs = require('fs');
const mariadb = require('mariadb');

function parseEnvValue(path, key) {
  const text = fs.readFileSync(path, 'utf8');
  const match = text.match(new RegExp(`^${key}="?([^"\\r\\n]+)"?`, 'm'));
  return match ? match[1] : null;
}

function mysqlConfig(url) {
  const parsed = new URL(url);
  return {
    host: parsed.hostname,
    port: Number(parsed.port || 3306),
    user: decodeURIComponent(parsed.username),
    password: decodeURIComponent(parsed.password),
    database: decodeURIComponent(parsed.pathname.slice(1)),
    ...(parsed.searchParams.get('sslaccept') ? { ssl: { rejectUnauthorized: false } } : {}),
  };
}

async function main() {
  const targetUrl = parseEnvValue('.env.local', 'DATABASE_URL');
  const sourceEnv = 'E:/Mock Exam/mock-exam-platform/.env';
  const sourceUrl = fs.existsSync(sourceEnv) ? parseEnvValue(sourceEnv, 'DATABASE_URL') : null;

  for (const [name, url] of [['target (pgcip_db)', targetUrl], ['source (mock_exam)', sourceUrl]]) {
    if (!url) {
      console.log(`${name}: skipped (old Mock Exam project directory no longer exists)`);
      continue;
    }
    let connection;
    try {
      connection = await mariadb.createConnection(mysqlConfig(url));
      const rows = await connection.query('SELECT VERSION() AS version, DATABASE() AS db');
      console.log(`${name}: ${JSON.stringify(rows[0])}`);
      const tables = await connection.query(
        `SELECT TABLE_NAME AS name, TABLE_ROWS AS approxRows FROM information_schema.TABLES WHERE TABLE_SCHEMA = ? ORDER BY TABLE_NAME`,
        [mysqlConfig(url).database],
      );
      console.log(`  tables: ${tables.length}`);
      for (const table of tables) console.log(`    ${table.name}: ~${table.approxRows}`);
    } catch (error) {
      console.error(`${name} ERROR: ${error.message}`);
    } finally {
      if (connection) await connection.end();
    }
  }
}

main().catch((error) => { console.error(error); process.exit(1); });
