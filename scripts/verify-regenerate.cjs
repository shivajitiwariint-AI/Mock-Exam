/* eslint-disable */
const fs = require('fs');

function envValue(file, key) {
  const line = fs.readFileSync(file, 'utf8').split(/\r?\n/).find((l) => l.trim().startsWith(`${key}=`));
  return line ? line.slice(line.indexOf('=') + 1).trim().replace(/^"|"$/g, '') : null;
}

(async () => {
  const { SignJWT } = await import('jose');
  const secret = new TextEncoder().encode(envValue('.env.local', 'JWT_SECRET') ?? 'fallback');
  const token = await new SignJWT({
    userId: 1,
    email: 'shivajitiwari@gmail.com',
    isAdmin: true,
    role: 'SUPER_ADMIN',
    status: 'ACTIVE',
  })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('7d')
    .sign(secret);
  const headers = { cookie: `pgcip_token=${token}` };

  const list = await fetch('http://localhost:3000/api/interview/questions?source=interview&pageSize=5', { headers });
  const data = await list.json();
  console.log('Owned questions:', data.questions.map((q) => ({ id: q.id, question: q.question, answerLength: String(q.answer ?? '').length })));

  if (data.questions.length === 0) {
    console.log('No owned question available to regenerate.');
    return;
  }

  const target = data.questions[0];
  const response = await fetch(`http://localhost:3000/api/interview/questions/${target.id}/regenerate-answer`, {
    method: 'POST',
    headers,
  });
  const result = await response.json();
  console.log('\nRegenerate response:', response.status);
  console.log('  questionId:', result.questionId);
  console.log('  answer length:', String(result.answer ?? '').length);
  console.log('  preview:', String(result.answer ?? result.error ?? '').slice(0, 240));
})();
