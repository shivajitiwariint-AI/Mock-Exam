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

  async function get(path) {
    const response = await fetch(`http://localhost:3000${path}`, {
      headers: { cookie: `pgcip_token=${token}` },
    });
    const data = await response.json();
    return { status: response.status, data };
  }

  const base = await get('/api/interview/questions?page=1&pageSize=3');
  const facets = base.data.facets;
  console.log('Base response:', base.status);
  console.log('  total:', base.data.pagination.total, '| page items:', base.data.questions.length);
  console.log('  facets:', {
    sources: facets.sources,
    subjects: facets.subjects.map((s) => `${s.name}(${s.count})`),
    topicCount: facets.topics.length,
    categories: facets.categories.map((c) => `${c.name}(${c.count})`),
    companies: facets.companies.length,
  });
  console.log('  first question:', {
    subject: base.data.questions[0]?.subjectName,
    topic: base.data.questions[0]?.topicName,
    category: base.data.questions[0]?.category,
    answerLength: String(base.data.questions[0]?.answer ?? '').length,
  });

  const all = await get('/api/interview/questions?all=true');
  console.log('\nBulk (grouping) response:', all.status, '| items:', all.data.questions.length, '| total:', all.data.pagination.total);

  if (facets.subjects.length > 0) {
    const filtered = await get(`/api/interview/questions?subjectId=${facets.subjects[0].id}&all=true`);
    const subjects = new Set(filtered.data.questions.map((q) => q.subjectName));
    console.log('Subject filter:', facets.subjects[0].name, '| items:', filtered.data.questions.length, '| subjects:', [...subjects]);
    console.log('  left-panel facets unchanged:', JSON.stringify(filtered.data.facets) === JSON.stringify(base.data.facets));
  }

  if (facets.topics.length > 0) {
    const filtered = await get(`/api/interview/questions?topicId=${facets.topics[0].id}&all=true`);
    console.log('Topic filter:', facets.topics[0].name, '| items:', filtered.data.questions.length);
  }

  for (const source of ['guide', 'mock', 'interview']) {
    const filtered = await get(`/api/interview/questions?source=${source}&pageSize=1`);
    console.log(`Source filter ${source}: total ${filtered.data.pagination.total} | facets unchanged: ${JSON.stringify(filtered.data.facets) === JSON.stringify(base.data.facets)}`);
  }

  const categoryFiltered = await get(`/api/interview/questions?category=${encodeURIComponent(facets.categories[0].name)}&pageSize=1`);
  console.log(`Category filter ${facets.categories[0].name}: total ${categoryFiltered.data.pagination.total} | facets unchanged: ${JSON.stringify(categoryFiltered.data.facets) === JSON.stringify(base.data.facets)}`);
})();
