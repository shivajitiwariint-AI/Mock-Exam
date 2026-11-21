/* eslint-disable */
/**
 * Copies required Mock Exam environment values into pgcip/.env.local without
 * overwriting values already present. Secrets are never printed.
 */
const fs = require('fs');
const path = require('path');

function parseEnv(filePath) {
  const result = new Map();
  for (const line of fs.readFileSync(filePath, 'utf8').split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const index = trimmed.indexOf('=');
    if (index < 0) continue;
    const key = trimmed.slice(0, index);
    let value = trimmed.slice(index + 1).trim();
    if (value.startsWith('"') && value.endsWith('"')) value = value.slice(1, -1);
    result.set(key, value);
  }
  return result;
}

const source = parseEnv('E:/Mock Exam/mock-exam-platform/.env');
const targetPath = '.env.local';
let targetText = fs.readFileSync(targetPath, 'utf8');
const existing = parseEnv(targetPath);

const keys = ['GROQ_API_KEY', 'GROQ_BASE_URL', 'GROQ_MODEL', 'CRON_SECRET', 'MAX_UPLOAD_MB', 'SEED_DEMO', 'S3_BUCKET'];
const additions = [];
for (const key of keys) {
  if (existing.has(key)) continue;
  const value = source.get(key) ?? '';
  additions.push(`${key}="${value}"`);
}

if (additions.length > 0) {
  if (!targetText.endsWith('\n')) targetText += '\n';
  targetText += `\n# Mock Exam platform (merged)\n`;
  targetText += additions.join('\n') + '\n';
  fs.writeFileSync(targetPath, targetText);
  console.log(`Added ${additions.length} variables to ${targetPath}: ${keys.filter((k) => !existing.has(k)).join(', ')}`);
} else {
  console.log('All Mock Exam variables already present.');
}
void path;
