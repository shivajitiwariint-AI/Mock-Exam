/* eslint-disable */
/**
 * End-to-end smoke tests for the merged PGOS + Mock Exam app.
 * Uses a signed JWT for user 1 (SUPER_ADMIN) and cleans up every record it creates.
 */
const fs = require("fs");
const mariadb = require("mariadb");

const BASE = process.env.SMOKE_BASE_URL ?? "http://localhost:3000";
const STAMP = new Date().toISOString().replace(/[-:.TZ]/g, "").slice(0, 14);
const results = [];
const failures = [];
const created = {
  mockSubjectId: null,
  mockTopicId: null,
  mockQuestionId: null,
  mockExamId: null,
  mockAttemptId: null,
  legacySubjectId: null,
  legacyTopicId: null,
  legacyQuestionId: null,
  legacyExamId: null,
  legacyResultId: null,
  interviewPrepId: null,
  interviewQuestionId: null,
  interviewSessionId: null,
};

function envValue(filePath, key) {
  for (const line of fs.readFileSync(filePath, "utf8").split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed.startsWith(`${key}=`)) continue;
    let value = trimmed.slice(key.length + 1).trim();
    if (value.startsWith('"') && value.endsWith('"')) value = value.slice(1, -1);
    return value;
  }
  return null;
}

function dbConfig(url) {
  const parsed = new URL(url);
  return {
    host: parsed.hostname,
    port: Number(parsed.port || 3306),
    user: decodeURIComponent(parsed.username),
    password: decodeURIComponent(parsed.password),
    database: decodeURIComponent(parsed.pathname.slice(1)),
    connectTimeout: 10000,
  };
}

function pass(label, detail = "") {
  results.push(`PASS ${label}${detail ? ` — ${detail}` : ""}`);
}

function fail(label, detail = "") {
  failures.push(`FAIL ${label}${detail ? ` — ${detail}` : ""}`);
}

function check(condition, label, detail = "") {
  if (condition) pass(label, detail);
  else fail(label, detail);
}

function unwrap(json) {
  if (!json || typeof json !== "object") return json;
  return Object.prototype.hasOwnProperty.call(json, "data") ? json.data : json;
}

async function signToken() {
  const { SignJWT } = await import("jose");
  const secret = new TextEncoder().encode(envValue(".env.local", "JWT_SECRET") ?? "fallback");
  return new SignJWT({
    userId: 1,
    email: "shivajitiwari@gmail.com",
    isAdmin: true,
    role: "SUPER_ADMIN",
    status: "ACTIVE",
  })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("7d")
    .sign(secret);
}

let TOKEN = "";

async function request(method, path, options = {}) {
  const headers = { ...(options.headers ?? {}) };
  if (TOKEN && options.auth !== false) headers.Cookie = `pgcip_token=${TOKEN}`;
  let body;
  if (options.body !== undefined) {
    headers["Content-Type"] = "application/json";
    body = JSON.stringify(options.body);
  }
  const response = await fetch(`${BASE}${path}`, {
    method,
    headers,
    body,
    redirect: "manual",
    signal: AbortSignal.timeout(30000),
  });
  const text = await response.text();
  let json = null;
  if (text) {
    try { json = JSON.parse(text); } catch { /* non-JSON response */ }
  }
  return { status: response.status, json, text, headers: response.headers };
}

async function expect(method, path, expected, label, options = {}) {
  const response = await request(method, path, options);
  check(response.status === expected, label, `HTTP ${response.status}${response.status === expected ? "" : ` body=${response.text.slice(0, 300)}`}`);
  return response;
}

async function expectData(method, path, label, options = {}, validate = () => true) {
  const response = await expect(method, path, 200, label, options);
  const data = unwrap(response.json);
  check(validate(data), `${label} payload`, JSON.stringify(data).slice(0, 220));
  return data;
}

async function cleanup(db) {
  const deletes = [];
  const run = (sql, params) => deletes.push(db.query(sql, params));

  if (created.interviewSessionId) {
    run("DELETE FROM interview_answers WHERE sessionId = ?", [created.interviewSessionId]);
    run("DELETE FROM interview_session_questions WHERE sessionId = ?", [created.interviewSessionId]);
    run("DELETE FROM interview_proctor_events WHERE sessionId = ?", [created.interviewSessionId]);
    run("DELETE FROM interview_sessions WHERE id = ?", [created.interviewSessionId]);
  }
  if (created.interviewPrepId) {
    run("DELETE FROM interview_prep_questions WHERE prepId = ?", [created.interviewPrepId]);
    run("DELETE FROM interview_proctor_events WHERE prepId = ?", [created.interviewPrepId]);
    run("DELETE FROM interview_sessions WHERE prepId = ?", [created.interviewPrepId]);
    run("DELETE FROM interview_preps WHERE id = ?", [created.interviewPrepId]);
  }

  if (created.mockAttemptId) {
    run("DELETE FROM student_answers WHERE attemptId = ?", [created.mockAttemptId]);
    run("DELETE FROM exam_attempt_questions WHERE attemptId = ?", [created.mockAttemptId]);
    run("DELETE FROM attempt_results WHERE attemptId = ?", [created.mockAttemptId]);
    run("DELETE FROM exam_attempts WHERE id = ?", [created.mockAttemptId]);
  }
  if (created.mockExamId) run("DELETE FROM exam_questions WHERE examId = ?", [created.mockExamId]);
  if (created.mockExamId) run("DELETE FROM exams WHERE id = ?", [created.mockExamId]);
  if (created.mockQuestionId) run("DELETE FROM questions WHERE id = ?", [created.mockQuestionId]);
  if (created.mockTopicId) run("DELETE FROM topics WHERE id = ?", [created.mockTopicId]);
  if (created.mockSubjectId) run("DELETE FROM subjects WHERE id = ?", [created.mockSubjectId]);

  if (created.legacyResultId) run("DELETE FROM exam_results WHERE id = ?", [created.legacyResultId]);
  if (created.legacyExamId) {
    run("DELETE FROM exam_results WHERE examId = ?", [created.legacyExamId]);
    run("DELETE FROM exam_questions WHERE examId = ?", [created.legacyExamId]);
    run("DELETE FROM exams WHERE id = ?", [created.legacyExamId]);
  }
  if (created.legacyQuestionId) {
    run("DELETE FROM question_answers WHERE questionId = ?", [created.legacyQuestionId]);
    run("DELETE FROM questions WHERE id = ?", [created.legacyQuestionId]);
  }
  if (created.legacyTopicId) {
    run("DELETE FROM subtopics WHERE topicId = ?", [created.legacyTopicId]);
    run("DELETE FROM topics WHERE id = ?", [created.legacyTopicId]);
  }
  if (created.legacySubjectId) run("DELETE FROM subjects WHERE id = ?", [created.legacySubjectId]);

  const entityIds = Object.values(created).filter(Boolean).map(String);
  if (entityIds.length) run("DELETE FROM audit_logs WHERE entityId IN (?)", [entityIds]);

  for (const deletion of deletes) {
    try { await deletion; } catch (error) { fail("cleanup", error.message); }
  }
}

async function main() {
  const db = await mariadb.createConnection(dbConfig(envValue(".env.local", "DATABASE_URL")));
  TOKEN = await signToken();

  try {
    // ── Preflight / auth ────────────────────────────────────────────────────
    const health = await expectData("GET", "/api/health/health", "health endpoint", {}, (data) => data?.status === "ok");
    pass("database health", health?.database ?? "");
    await expect("GET", "/login", 200, "login page renders");
    await expect("POST", "/api/auth/login", 401, "invalid credentials rejected", {
      body: { email: "shivajitiwari@gmail.com", password: "definitely-wrong-password" },
    });
    await expect("GET", "/api/auth/me", 401, "protected API rejects missing token", { auth: false });
    const unauthorizedPage = await request("GET", "/dashboard", { auth: false });
    check([302, 307, 308].includes(unauthorizedPage.status), "protected page redirects when signed out", `HTTP ${unauthorizedPage.status}`);

    const me = await expectData("GET", "/api/auth/me", "authenticated me endpoint", {}, (data) => data?.role === "SUPER_ADMIN");
    check(me?.name === "Shivaji Tiwari", "merged user name", me?.name ?? "");
    await expectData("GET", "/api/me", "legacy me endpoint", {}, (data) => Boolean(data));

    // ── Page routes ─────────────────────────────────────────────────────────
    const pgosPages = [
      "/dashboard", "/goals", "/health", "/meditation", "/schedule",
      "/achievements", "/analytics", "/coach", "/interview",
      "/interview/questions", "/interview/companies", "/interview/experiences",
      "/education", "/admin", "/admin/growth", "/admin/mock-exam",
      "/admin/users", "/admin/subjects", "/admin/progress", "/admin/interviews",
    ];
    for (const page of pgosPages) await expect("GET", page, 200, `PGOS page ${page}`);

    const mockPages = [
      "/exam-dashboard", "/exams", "/study", "/history", "/interviews",
    ];
    for (const page of mockPages) await expect("GET", page, 200, `Mock page ${page}`);

    // The retired /question-bank URL redirects to the canonical interview bank.
    await expect("GET", "/question-bank", 307, "legacy question bank redirects");

    // ── Read-only APIs ──────────────────────────────────────────────────────
    const pgosApis = [
      "/api/goals", "/api/health/logs/today", "/api/meditation/logs",
      "/api/schedule/blocks", "/api/achievements", "/api/growth-score",
      "/api/interview/companies", "/api/interview/questions",
      "/api/interview/categories", "/api/interview/experiences",
      "/api/dashboard/overview", "/api/dashboard/history", "/api/dashboard/subjects",
      "/api/user/profile", "/api/admin/dashboard", "/api/admin/users",
      "/api/admin/growth-users", "/api/admin/subjects", "/api/admin/progress",
      "/api/admin/interviews",
    ];
    for (const endpoint of pgosApis) await expect("GET", endpoint, 200, `PGOS API ${endpoint}`);

    const mockApis = ["/api/subjects", "/api/exams", "/api/interviews"];
    for (const endpoint of mockApis) await expect("GET", endpoint, 200, `Mock API ${endpoint}`);

    // ── Mock Exam authoring → attempt flow ──────────────────────────────────
    const subject = unwrap((await expect("POST", "/api/admin/subjects", 201, "create Mock subject", {
      body: { name: `Smoke Subject ${STAMP}`, description: "Temporary smoke-test subject" },
    })).json);
    created.mockSubjectId = subject?.id ?? null;
    check(Boolean(created.mockSubjectId), "Mock subject id returned", String(created.mockSubjectId));

    const topic = unwrap((await expect("POST", `/api/admin/subjects/${created.mockSubjectId}/topics`, 201, "create Mock topic", {
      body: { name: `Smoke Topic ${STAMP}` },
    })).json);
    created.mockTopicId = topic?.id ?? null;
    check(Boolean(created.mockTopicId), "Mock topic id returned", String(created.mockTopicId));

    const questionBody = {
      type: "MCQ",
      topicId: created.mockTopicId,
      questionText: `Which value verifies the merged Mock Exam flow ${STAMP}?`,
      options: [
        { key: "A", text: "The shared database" },
        { key: "B", text: "A separate database" },
      ],
      correctOption: "A",
      explanation: "Both apps now use pgcip_db.",
      difficulty: "EASY",
      status: "PENDING_REVIEW",
    };
    const mockQuestion = unwrap((await expect("POST", `/api/admin/subjects/${created.mockSubjectId}/questions`, 201, "create Mock question", {
      body: questionBody,
    })).json);
    created.mockQuestionId = mockQuestion?.id ?? null;
    check(Boolean(created.mockQuestionId), "Mock question id returned", String(created.mockQuestionId));

    await expect("POST", `/api/admin/questions/${created.mockQuestionId}/approve`, 200, "approve Mock question");
    const updatedQuestion = unwrap((await expect("PATCH", `/api/admin/questions/${created.mockQuestionId}`, 200, "update Mock question", {
      body: { ...questionBody, questionText: `${questionBody.questionText} (updated)` },
    })).json);
    check(updatedQuestion?.questionText?.includes("updated"), "Mock question update persisted");
    await expect("POST", `/api/admin/questions/${created.mockQuestionId}/approve`, 200, "re-approve Mock question");

    const now = Date.now();
    const examPayload = {
      title: `Smoke Mock Exam ${STAMP}`,
      description: "Temporary exam created by smoke tests",
      topicId: created.mockTopicId,
      durationMinutes: 30,
      passPercentage: 50,
      marksPerQuestion: 1,
      negativeMarks: 0,
      maxAttempts: 2,
      shuffleQuestions: false,
      shuffleOptions: false,
      reviewPolicy: "AFTER_SUBMIT",
      availabilityStart: new Date(now - 60_000).toISOString(),
      availabilityEnd: new Date(now + 86_400_000).toISOString(),
      questionIds: [created.mockQuestionId],
    };
    const exam = unwrap((await expect("POST", `/api/admin/subjects/${created.mockSubjectId}/exams`, 201, "create Mock exam", {
      body: examPayload,
    })).json);
    created.mockExamId = exam?.id ?? null;
    check(Boolean(created.mockExamId), "Mock exam id returned", String(created.mockExamId));

    await expect("POST", `/api/admin/exams/${created.mockExamId}/publish`, 200, "publish Mock exam", { body: { published: true } });
    await expectData("GET", "/api/exams", "list student Mock exams", {}, (data) => Array.isArray(data) && data.some((e) => e.id === created.mockExamId));

    const attempt = unwrap((await expect("POST", `/api/exams/${created.mockExamId}/start`, 201, "start Mock exam attempt")).json);
    created.mockAttemptId = attempt?.attempt?.id ?? attempt?.id ?? null;
    const attemptQuestions = attempt?.questions ?? [];
    check(Boolean(created.mockAttemptId) && attemptQuestions.length > 0, "Mock attempt started with questions", `attempt=${created.mockAttemptId}, questions=${attemptQuestions.length}`);

    await expect("PUT", `/api/exam-attempts/${created.mockAttemptId}/answers`, 200, "save Mock attempt answer", {
      body: { answers: [{ attemptQuestionId: attemptQuestions[0]?.id, selectedOption: "A" }] },
    });
    const submitted = unwrap((await expect("POST", `/api/exam-attempts/${created.mockAttemptId}/submit`, 200, "submit Mock attempt")).json);
    check(Boolean(submitted?.result), "Mock attempt produced a result", JSON.stringify(submitted?.result ?? {}).slice(0, 160));
    await expectData("GET", `/api/exam-attempts/${created.mockAttemptId}`, "read Mock attempt view", {}, (data) => Boolean(data?.attempt));
    await expectData("GET", "/api/dashboard/history?page=1&pageSize=15", "Mock history includes attempt", {}, (data) => Array.isArray(data?.items) && data.items.some((a) => a.id === created.mockAttemptId || a.attemptId === created.mockAttemptId));
    await expectData("GET", "/api/interview/questions?source=mock", "Interview bank includes Mock question", {}, (data) => Array.isArray(data?.questions) && data.questions.some((q) => q.id === -created.mockQuestionId));
    await expect("GET", `/attempts/${created.mockAttemptId}`, 200, "Mock attempt page renders");
    await expect("GET", `/exams/${created.mockExamId}`, 200, "Mock exam page renders");

    const study = await expect("POST", "/api/study/query", 422, "study assistant rejects missing material", {
      body: { subjectId: created.mockSubjectId, question: "What does this subject cover?" },
    });
    check(study.json?.error?.code === "NO_STUDY_MATERIAL", "study assistant error code", JSON.stringify(study.json).slice(0, 160));

    // ── Interview prep / proctoring ─────────────────────────────────────────
    const prepInsert = await db.query(
      "INSERT INTO interview_preps (userId, title, status, targetQuestionCount, createdAt, updatedAt) VALUES (?, ?, 'READY', ?, NOW(), NOW())",
      [1, `Smoke Interview Prep ${STAMP}`, 1],
    );
    created.interviewPrepId = Number(prepInsert.insertId);
    const questionInsert = await db.query(
      "INSERT INTO interview_prep_questions (prepId, `order`, questionText, category, difficulty, createdAt) VALUES (?, ?, ?, 'TECHNICAL', 'EASY', NOW())",
      [created.interviewPrepId, 1, `Explain the merged Mock Exam architecture ${STAMP}?`],
    );
    created.interviewQuestionId = Number(questionInsert.insertId);

    await expectData("GET", "/api/interviews", "list interview preps", {}, (data) => Array.isArray(data) && data.some((p) => p.id === created.interviewPrepId));
    const session = unwrap((await expect("POST", `/api/interviews/${created.interviewPrepId}/sessions`, 201, "start interview session")).json);
    created.interviewSessionId = session?.sessionId ?? null;
    check(Boolean(created.interviewSessionId), "interview session id returned", String(created.interviewSessionId));
    await expect("POST", `/api/interviews/sessions/${created.interviewSessionId}/proctor`, 200, "record proctor event", {
      body: { type: "TAB_HIDDEN", metadata: { source: "smoke-test" } },
    });
    await expectData("GET", `/api/interviews/sessions/${created.interviewSessionId}`, "read interview session", {}, (data) => Boolean(data?.session || data?.questions));
    await expect("GET", `/interviews/sessions/${created.interviewSessionId}`, 200, "interview session page renders");
    await expectData("GET", "/api/admin/interviews", "admin interviews includes prep", {}, (data) => {
      const items = Array.isArray(data) ? data : data?.items ?? [];
      return items.some((p) => p.id === created.interviewPrepId);
    });

    // ── Legacy PGOS education flow ──────────────────────────────────────────
    const legacySubject = unwrap((await expect("POST", "/api/education/subjects", 201, "create legacy PGOS subject", {
      body: { name: `Legacy Smoke ${STAMP}`, description: "Temporary legacy education smoke test" },
    })).json)?.subject;
    created.legacySubjectId = legacySubject?.id ?? null;
    check(Boolean(created.legacySubjectId), "legacy subject id returned", String(created.legacySubjectId));

    const legacyTopic = unwrap((await expect("POST", `/api/education/subjects/${created.legacySubjectId}/topics`, 201, "create legacy topic", {
      body: { name: `Legacy Topic ${STAMP}` },
    })).json)?.topic;
    created.legacyTopicId = legacyTopic?.id ?? null;
    check(Boolean(created.legacyTopicId), "legacy topic id returned", String(created.legacyTopicId));

    const legacyQuestionBody = {
      topicId: created.legacyTopicId,
      type: "MCQ",
      content: `Which field does the legacy PGOS UI expect ${STAMP}?`,
      explanation: "The compatibility layer maps questionText to content.",
      difficulty: "EASY",
      answers: [
        { content: "content", isCorrect: true, order: 0 },
        { content: "body", isCorrect: false, order: 1 },
      ],
    };
    const legacyQuestion = unwrap((await expect("POST", "/api/education/questions", 201, "create legacy question", {
      body: legacyQuestionBody,
    })).json)?.question;
    created.legacyQuestionId = legacyQuestion?.id ?? null;
    check(legacyQuestion?.content === legacyQuestion?.questionText, "legacy create maps questionText to content", legacyQuestion?.content ?? "");
    let correctAnswerId = legacyQuestion?.answers?.find((a) => a.isCorrect)?.id;

    await expect("GET", `/api/education/questions/${created.legacyQuestionId}`, 200, "read legacy question");
    const legacyUpdated = unwrap((await expect("PUT", `/api/education/questions/${created.legacyQuestionId}`, 200, "update legacy question", {
      body: { ...legacyQuestionBody, content: `${legacyQuestionBody.content} (updated)` },
    })).json)?.question;
    check(String(legacyUpdated?.content ?? "").includes("updated"), "legacy update maps content to questionText", legacyUpdated?.content ?? "");
    correctAnswerId = legacyUpdated?.answers?.find((a) => a.isCorrect)?.id ?? correctAnswerId;

    const legacyExam = unwrap((await expect("POST", "/api/education/exams", 201, "create legacy exam", {
      body: {
        title: `Legacy Exam ${STAMP}`,
        topicId: created.legacyTopicId,
        questionIds: [created.legacyQuestionId],
        timeLimitMins: 10,
      },
    })).json)?.exam;
    created.legacyExamId = legacyExam?.id ?? null;
    check(Boolean(created.legacyExamId), "legacy exam id returned", String(created.legacyExamId));

    const legacyExamView = unwrap((await expect("GET", `/api/education/exams/${created.legacyExamId}`, 200, "read legacy exam")).json)?.exam;
    check(legacyExamView?.questions?.[0]?.question?.content === legacyExamView?.questions?.[0]?.question?.questionText, "legacy exam response maps content", JSON.stringify(legacyExamView?.questions?.[0]?.question ?? {}).slice(0, 160));

    const legacyResult = unwrap((await expect("POST", `/api/education/exams/${created.legacyExamId}/submit`, 201, "submit legacy exam", {
      body: { answers: { [String(created.legacyQuestionId)]: String(correctAnswerId) }, timeTaken: 5 },
    })).json)?.result;
    created.legacyResultId = legacyResult?.id ?? null;
    check(legacyResult?.score === 100, "legacy exam scored correctly", JSON.stringify(legacyResult ?? {}).slice(0, 160));
    await expectData("GET", `/api/education/exams/${created.legacyExamId}/results`, "list legacy results", {}, (data) => Array.isArray(data?.results) && data.results.some((r) => r.id === created.legacyResultId));
    await expect("GET", `/education/topics/${created.legacyTopicId}`, 200, "legacy topic page renders");
    await expect("GET", `/education/exams/${created.legacyExamId}/results?resultId=${created.legacyResultId}`, 200, "legacy results page renders");

    // ── Final state checks ──────────────────────────────────────────────────
    await expectData("GET", "/api/admin/dashboard", "admin dashboard after activity", {}, (data) => Boolean(data));
  } finally {
    await cleanup(db);
    await db.end();
  }

  console.log(results.join("\n"));
  if (failures.length) {
    console.log("\n" + failures.join("\n"));
    console.log(`\nSUMMARY: ${results.length} passed, ${failures.length} failed`);
    process.exitCode = 1;
  } else {
    console.log(`\nSUMMARY: ${results.length} passed, 0 failed`);
  }
}

main().catch((error) => {
  console.error("SMOKE TEST CRASHED:", error);
  console.log(results.join("\n"));
  if (failures.length) console.log("\n" + failures.join("\n"));
  process.exit(1);
});
