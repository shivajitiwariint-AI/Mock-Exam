/* eslint-disable */
/**
 * Migrates data from the old Mock Exam database (string IDs) into the merged
 * PGOS database (integer IDs). All references are remapped through per-table
 * ID maps. Re-running is safe for the user table (matched by email).
 *
 * Usage: node scripts/migrate-mock-data.cjs [--dry-run]
 */
const fs = require('fs');
const mariadb = require('mariadb');

const DRY_RUN = process.argv.includes('--dry-run');

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

// `map` is source column -> target column. `refTables` identifies columns that
// hold string IDs from another source table and therefore need remapping.
const TABLES = [
  {
    source: 'users', target: 'user', idColumn: 'id',
    map: { id: 'id', email: 'email', name: 'name', role: 'role', status: 'status', lastLoginAt: 'lastLoginAt', createdAt: 'createdAt', updatedAt: 'updatedAt', passwordHash: 'password' },
  },
  {
    source: 'subjects', target: 'subjects', idColumn: 'id',
    map: { id: 'id', name: 'name', slug: 'slug', description: 'description', status: 'status', createdAt: 'createdAt', updatedAt: 'updatedAt' },
  },
  {
    source: 'subject_admins', target: 'subject_admins', idColumn: 'id',
    map: { id: 'id', subjectId: 'subjectId', userId: 'userId', assignedById: 'assignedById', createdAt: 'createdAt' },
    refTables: { subjectId: 'subjects', userId: 'users', assignedById: 'users' },
  },
  {
    source: 'topics', target: 'topics', idColumn: 'id',
    map: { id: 'id', subjectId: 'subjectId', name: 'name', description: 'description', createdAt: 'createdAt', updatedAt: 'updatedAt' },
    refTables: { subjectId: 'subjects' },
  },
  {
    source: 'documents', target: 'documents', idColumn: 'id',
    map: { id: 'id', subjectId: 'subjectId', topicId: 'topicId', uploaderId: 'uploaderId', originalFilename: 'originalFilename', storageKey: 'storageKey', mimeType: 'mimeType', sizeBytes: 'sizeBytes', checksum: 'checksum', status: 'status', processingMessage: 'processingMessage', errorMessage: 'errorMessage', pageCount: 'pageCount', chunkCount: 'chunkCount', processedAt: 'processedAt', questionGenerationStatus: 'questionGenerationStatus', questionGenerationProgress: 'questionGenerationProgress', questionGenerationMessage: 'questionGenerationMessage', generatedQuestionCount: 'generatedQuestionCount', questionGenerationCompletedAt: 'questionGenerationCompletedAt', createdAt: 'createdAt', updatedAt: 'updatedAt' },
    refTables: { subjectId: 'subjects', topicId: 'topics', uploaderId: 'users' },
  },
  {
    source: 'document_chunks', target: 'document_chunks', idColumn: 'id',
    map: { id: 'id', documentId: 'documentId', subjectId: 'subjectId', chunkIndex: 'chunkIndex', content: 'content', charCount: 'charCount', embedding: 'embedding', createdAt: 'createdAt' },
    refTables: { documentId: 'documents', subjectId: 'subjects' },
  },
  {
    source: 'questions', target: 'questions', idColumn: 'id',
    map: { id: 'id', subjectId: 'subjectId', topicId: 'topicId', sourceDocumentId: 'sourceDocumentId', sourceChunkId: 'sourceChunkId', type: 'type', questionText: 'questionText', options: 'options', correctOption: 'correctOption', explanation: 'explanation', difficulty: 'difficulty', status: 'status', source: 'source', contentHash: 'contentHash', aiModel: 'aiModel', createdById: 'userId', reviewedById: 'reviewedById', reviewedAt: 'reviewedAt', createdAt: 'createdAt', updatedAt: 'updatedAt' },
    refTables: { subjectId: 'subjects', topicId: 'topics', sourceDocumentId: 'documents', sourceChunkId: 'document_chunks', createdById: 'users', reviewedById: 'users' },
  },
  {
    source: 'exams', target: 'exams', idColumn: 'id',
    map: { id: 'id', subjectId: 'subjectId', topicId: 'topicId', createdById: 'userId', title: 'title', description: 'description', durationMinutes: 'durationMinutes', passPercentage: 'passPercentage', marksPerQuestion: 'marksPerQuestion', negativeMarks: 'negativeMarks', maxAttempts: 'maxAttempts', shuffleQuestions: 'shuffleQuestions', shuffleOptions: 'shuffleOptions', reviewPolicy: 'reviewPolicy', status: 'status', availabilityStart: 'availabilityStart', availabilityEnd: 'availabilityEnd', publishedAt: 'publishedAt', createdAt: 'createdAt', updatedAt: 'updatedAt' },
    refTables: { subjectId: 'subjects', topicId: 'topics', createdById: 'users' },
  },
  {
    source: 'exam_questions', target: 'exam_questions',
    map: { examId: 'examId', questionId: 'questionId', order: 'order', marks: 'marks' },
    refTables: { examId: 'exams', questionId: 'questions' },
  },
  {
    source: 'exam_attempts', target: 'exam_attempts', idColumn: 'id',
    map: { id: 'id', examId: 'examId', studentId: 'studentId', attemptNumber: 'attemptNumber', status: 'status', startedAt: 'startedAt', expiresAt: 'expiresAt', submittedAt: 'submittedAt', lastSavedAt: 'lastSavedAt', createdAt: 'createdAt', updatedAt: 'updatedAt' },
    refTables: { examId: 'exams', studentId: 'users' },
  },
  {
    source: 'exam_attempt_questions', target: 'exam_attempt_questions', idColumn: 'id',
    map: { id: 'id', attemptId: 'attemptId', questionId: 'questionId', order: 'order', marks: 'marks', snapshot: 'snapshot', createdAt: 'createdAt' },
    refTables: { attemptId: 'exam_attempts', questionId: 'questions' },
  },
  {
    source: 'student_answers', target: 'student_answers', idColumn: 'id',
    map: { id: 'id', attemptId: 'attemptId', attemptQuestionId: 'attemptQuestionId', selectedOption: 'selectedOption', createdAt: 'createdAt', updatedAt: 'updatedAt' },
    refTables: { attemptId: 'exam_attempts', attemptQuestionId: 'exam_attempt_questions' },
  },
  {
    source: 'exam_results', target: 'attempt_results', idColumn: 'id',
    map: { id: 'id', attemptId: 'attemptId', score: 'score', maxScore: 'maxScore', percentage: 'percentage', correctCount: 'correctCount', incorrectCount: 'incorrectCount', unansweredCount: 'unansweredCount', passed: 'passed', timeTakenSeconds: 'timeTakenSeconds', computedAt: 'computedAt' },
    refTables: { attemptId: 'exam_attempts' },
  },
  {
    source: 'audit_logs', target: 'audit_logs', idColumn: 'id',
    map: { id: 'id', actorId: 'actorId', action: 'action', entityType: 'entityType', entityId: 'entityId', metadata: 'metadata', ipAddress: 'ipAddress', createdAt: 'createdAt' },
    refTables: { actorId: 'users' },
  },
  {
    source: 'processing_jobs', target: 'processing_jobs', idColumn: 'id',
    map: { id: 'id', type: 'type', status: 'status', payload: 'payload', attempts: 'attempts', maxAttempts: 'maxAttempts', progress: 'progress', progressMessage: 'progressMessage', runAt: 'runAt', lockedAt: 'lockedAt', lastError: 'lastError', result: 'result', createdAt: 'createdAt', updatedAt: 'updatedAt' },
  },
  {
    source: 'rate_limit_buckets', target: 'rate_limit_buckets', noId: true,
    map: { key: 'key', count: 'count', windowStart: 'windowStart', expiresAt: 'expiresAt', updatedAt: 'updatedAt' },
  },
  {
    source: 'interview_preps', target: 'interview_preps', idColumn: 'id',
    map: { id: 'id', userId: 'userId', title: 'title', company: 'company', role: 'role', resumeFilename: 'resumeFilename', resumeStorageKey: 'resumeStorageKey', jdFilename: 'jdFilename', jdStorageKey: 'jdStorageKey', resumeText: 'resumeText', jdText: 'jdText', interviewDate: 'interviewDate', actualQuestionsText: 'actualQuestionsText', actualQuestionsFilename: 'actualQuestionsFilename', actualQuestionsStorageKey: 'actualQuestionsStorageKey', targetQuestionCount: 'targetQuestionCount', status: 'status', errorMessage: 'errorMessage', aiModel: 'aiModel', proctorEventCount: 'proctorEventCount', proctorFlagCount: 'proctorFlagCount', createdAt: 'createdAt', updatedAt: 'updatedAt' },
    refTables: { userId: 'users' },
  },
  {
    source: 'interview_questions', target: 'interview_prep_questions', idColumn: 'id',
    map: { id: 'id', prepId: 'prepId', order: 'order', questionText: 'questionText', category: 'category', difficulty: 'difficulty', expectedAnswer: 'expectedAnswer', createdAt: 'createdAt' },
    refTables: { prepId: 'interview_preps' },
  },
  {
    source: 'interview_sessions', target: 'interview_sessions', idColumn: 'id',
    map: { id: 'id', prepId: 'prepId', userId: 'userId', status: 'status', startedAt: 'startedAt', completedAt: 'completedAt', overallScore: 'overallScore', summary: 'summary', strengths: 'strengths', improvementAreas: 'improvementAreas', recommendedPractice: 'recommendedPractice', createdAt: 'createdAt', updatedAt: 'updatedAt' },
    refTables: { prepId: 'interview_preps', userId: 'users' },
  },
  {
    source: 'interview_proctor_events', target: 'interview_proctor_events', idColumn: 'id',
    map: { id: 'id', sessionId: 'sessionId', prepId: 'prepId', userId: 'userId', type: 'type', flagged: 'flagged', occurredAt: 'occurredAt', metadata: 'metadata', createdAt: 'createdAt' },
    refTables: { sessionId: 'interview_sessions', prepId: 'interview_preps', userId: 'users' },
  },
  {
    source: 'interview_session_questions', target: 'interview_session_questions', idColumn: 'id',
    map: { id: 'id', sessionId: 'sessionId', questionId: 'questionId', order: 'order', createdAt: 'createdAt' },
    refTables: { sessionId: 'interview_sessions', questionId: 'interview_questions' },
  },
  {
    source: 'interview_answers', target: 'interview_answers', idColumn: 'id',
    map: { id: 'id', sessionId: 'sessionId', questionId: 'questionId', answerText: 'answerText', score: 'score', feedback: 'feedback', idealAnswer: 'idealAnswer', improvement: 'improvement', createdAt: 'createdAt', updatedAt: 'updatedAt' },
    refTables: { sessionId: 'interview_sessions', questionId: 'interview_questions' },
  },
];

const idMaps = new Map();

function mapId(table, value) {
  if (value === null || value === undefined) return null;
  const map = idMaps.get(table);
  const mapped = map?.get(String(value));
  if (mapped === undefined) {
    throw new Error(`No ID mapping for ${table}:${value}. Source row may be missing or orphaned.`);
  }
  return mapped;
}

async function nextId(conn, table) {
  const rows = await conn.query(`SELECT COALESCE(MAX(id), 0) + 1 AS nextId FROM \`${table}\``);
  return Number(rows[0].nextId);
}

async function migrate() {
  const source = await mariadb.createConnection(config(getVar('E:/Mock Exam/mock-exam-platform/.env', 'DATABASE_URL')));
  const target = await mariadb.createConnection(config(getVar('.env.local', 'DATABASE_URL')));
  const summary = [];

  try {
    for (const spec of TABLES) {
      const sourceRows = await source.query(`SELECT * FROM \`${spec.source}\``);
      const map = new Map();
      idMaps.set(spec.source, map);

      if (sourceRows.length === 0) {
        summary.push(`${spec.source} -> ${spec.target}: 0 rows`);
        continue;
      }

      let next = spec.noId ? null : await nextId(target, spec.target);
      let inserted = 0;
      let updated = 0;

      for (const row of sourceRows) {
        const data = {};
        for (const [sourceColumn, targetColumn] of Object.entries(spec.map)) {
          let value = row[sourceColumn];
          if (spec.refTables?.[sourceColumn]) {
            value = value === null || value === undefined ? null : mapId(spec.refTables[sourceColumn], value);
          }
          data[targetColumn] = value;
        }

        // The same person exists in both databases. Keep the PGOS password and
        // enrich the existing row; never create a duplicate account.
        if (spec.source === 'users') {
          const existing = await target.query('SELECT id FROM user WHERE email = ?', [row.email]);
          if (existing.length > 0) {
            const targetId = Number(existing[0].id);
            map.set(String(row.id), targetId);
            if (!DRY_RUN) {
              await target.query(
                'UPDATE user SET name = ?, role = ?, status = ?, lastLoginAt = ?, isAdmin = ? WHERE id = ?',
                [row.name ?? null, row.role, row.status, row.lastLoginAt ?? null, row.role === 'SUPER_ADMIN' ? 1 : 0, targetId],
              );
            }
            updated += 1;
            continue;
          }
          data.isAdmin = row.role === 'SUPER_ADMIN' ? 1 : 0;
        }

        if (spec.idColumn && !spec.noId) data[spec.idColumn] = next;

        const columns = Object.keys(data);
        const sql = `INSERT INTO \`${spec.target}\` (${columns.map((c) => `\`${c}\``).join(', ')}) VALUES (${columns.map(() => '?').join(', ')})`;
        if (!DRY_RUN) await target.query(sql, columns.map((c) => data[c]));
        if (spec.idColumn && !spec.noId) {
          map.set(String(row.id), next);
          next += 1;
        }
        inserted += 1;
      }

      summary.push(`${spec.source} -> ${spec.target}: ${inserted} inserted, ${updated} updated`);
    }
  } finally {
    await source.end();
    await target.end();
  }

  console.log(DRY_RUN ? '--- DRY RUN ---' : '--- MIGRATION COMPLETE ---');
  console.log(summary.join('\n'));
}

migrate().catch((error) => { console.error(error); process.exit(1); });
