/* eslint-disable */
const fs = require('fs');
const text = fs.readFileSync('E:/Mock Exam/mock-exam-platform/.env', 'utf8');
for (const line of text.split(/\r?\n/)) {
  const trimmed = line.trim();
  if (!trimmed || trimmed.startsWith('#')) continue;
  const index = trimmed.indexOf('=');
  if (index < 0) continue;
  const key = trimmed.slice(0, index);
  let value = trimmed.slice(index + 1).trim();
  if (value.startsWith('"') && value.endsWith('"')) value = value.slice(1, -1);
  const sensitive = /KEY|SECRET|TOKEN|PASSWORD/.test(key);
  console.log(`${key}=${sensitive ? (value ? `<set, ${value.length} chars>` : '<empty>') : value}`);
}
