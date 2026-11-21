/* eslint-disable */
/**
 * Imports the demo subject, topics, question bank and exam defined in the old
 * Mock Exam project's prisma/seed.ts into the merged pgcip_db database.
 * Idempotent: re-running will not create duplicates.
 */
const fs = require("fs");
const crypto = require("crypto");
const mariadb = require("mariadb");

const QUESTION_SEEDS = [
  {
    topic: "Databases",
    text: "Which property of ACID guarantees that a committed transaction survives a system crash?",
    options: [
      { key: "A", text: "Atomicity" },
      { key: "B", text: "Consistency" },
      { key: "C", text: "Durability" },
      { key: "D", text: "Isolation" },
    ],
    correct: "C",
    explanation:
      "Durability ensures that once a transaction commits, its changes are persisted even if the system fails immediately afterwards.",
  },
  {
    topic: "Databases",
    text: "In a relational database, which key uniquely identifies each row in a table?",
    options: [
      { key: "A", text: "Foreign key" },
      { key: "B", text: "Primary key" },
      { key: "C", text: "Candidate key" },
      { key: "D", text: "Composite key" },
    ],
    correct: "B",
    explanation:
      "A primary key uniquely identifies each row; candidate keys are minimal unique keys from which one is chosen as the primary key.",
  },
  {
    topic: "Databases",
    text: "Which normal form removes partial dependencies on a composite primary key?",
    options: [
      { key: "A", text: "First normal form" },
      { key: "B", text: "Second normal form" },
      { key: "C", text: "Third normal form" },
      { key: "D", text: "Boyce-Codd normal form" },
    ],
    correct: "B",
    explanation:
      "Second normal form requires every non-key attribute to depend on the whole primary key, eliminating partial dependencies.",
  },
  {
    topic: "Networks",
    text: "Which protocol provides reliable, ordered, connection-oriented delivery?",
    options: [
      { key: "A", text: "UDP" },
      { key: "B", text: "ICMP" },
      { key: "C", text: "TCP" },
      { key: "D", text: "ARP" },
    ],
    correct: "C",
    explanation:
      "TCP establishes a connection and uses acknowledgements and retransmission to provide reliable, ordered byte-stream delivery.",
  },
  {
    topic: "Networks",
    text: "What is the primary purpose of the Domain Name System (DNS)?",
    options: [
      { key: "A", text: "Assign IP addresses to hosts automatically" },
      { key: "B", text: "Translate domain names into IP addresses" },
      { key: "C", text: "Encrypt web traffic" },
      { key: "D", text: "Route packets between autonomous systems" },
    ],
    correct: "B",
    explanation:
      "DNS resolves human-readable domain names into IP addresses so clients can reach servers.",
  },
  {
    topic: "Networks",
    text: "Which device forwards packets between different IP subnets?",
    options: [
      { key: "A", text: "Hub" },
      { key: "B", text: "Layer 2 switch" },
      { key: "C", text: "Router" },
      { key: "D", text: "Repeater" },
    ],
    correct: "C",
    explanation:
      "Routers make forwarding decisions based on IP addresses and connect distinct networks or subnets.",
  },
  {
    topic: "Operating Systems",
    text: "Which scheduling algorithm can cause starvation of long-running processes?",
    options: [
      { key: "A", text: "First come, first served" },
      { key: "B", text: "Shortest job first" },
      { key: "C", text: "Round robin" },
      { key: "D", text: "Multilevel feedback queue with aging" },
    ],
    correct: "B",
    explanation:
      "Shortest job first favours short jobs; long jobs may wait indefinitely if short jobs keep arriving.",
  },
  {
    topic: "Operating Systems",
    text: "What is thrashing in a virtual memory system?",
    options: [
      { key: "A", text: "Excessive paging that leaves little time for useful work" },
      { key: "B", text: "A deadlock between two processes" },
      { key: "C", text: "A disk failure during a write" },
      { key: "D", text: "An interrupt storm caused by a faulty device" },
    ],
    correct: "A",
    explanation:
      "Thrashing occurs when the working set does not fit in memory, causing continuous page faults and very low CPU utilisation.",
  },
  {
    topic: "Operating Systems",
    text: "Which mechanism allows a process to request an operating system service?",
    options: [
      { key: "A", text: "Context switch" },
      { key: "B", text: "System call" },
      { key: "C", text: "Page fault" },
      { key: "D", text: "Interrupt vector" },
    ],
    correct: "B",
    explanation:
      "A system call transitions control from user mode to kernel mode so the kernel can perform a privileged operation.",
  },
  {
    topic: "Databases",
    text: "Which index structure is most commonly used by relational databases for range queries?",
    options: [
      { key: "A", text: "Hash table" },
      { key: "B", text: "B-tree" },
      { key: "C", text: "Bloom filter" },
      { key: "D", text: "Linked list" },
    ],
    correct: "B",
    explanation:
      "B-tree indexes keep keys ordered, which supports efficient equality and range scans. Hash indexes only support equality lookups.",
  },
];

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
    connectTimeout: 30000,
  };
}

function normalizeText(value) {
  return value.replace(/\s+/g, " ").trim().toLowerCase();
}

function questionContentHash(questionText, options) {
  const normalizedOptions = options
    .map((option) => `${normalizeText(option.key)}:${normalizeText(option.text)}`)
    .join("|");
  return crypto
    .createHash("sha256")
    .update(`${normalizeText(questionText)}::${normalizedOptions}`)
    .digest("hex");
}

async function main() {
  const db = await mariadb.createConnection(dbConfig(envValue(".env.local", "DATABASE_URL")));
  const stats = { subjectsCreated: 0, topicsCreated: 0, questionsCreated: 0, examsCreated: 0, examQuestionsCreated: 0 };

  try {
    let rows = await db.query("SELECT id FROM subjects WHERE slug = ?", ["computer-science-demo"]);
    let subjectId;
    if (rows.length) {
      subjectId = Number(rows[0].id);
    } else {
      const result = await db.query(
        "INSERT INTO subjects (userId, name, slug, description, status, color, icon, createdAt, updatedAt) VALUES (NULL, ?, ?, ?, 'ACTIVE', '#6366F1', '📚', NOW(), NOW())",
        [
          "Computer Science (Demo)",
          "computer-science-demo",
          "Demo subject covering databases, networks, and operating systems. Upload your own PDF/DOCX/TXT study material to try the RAG pipeline.",
        ],
      );
      subjectId = Number(result.insertId);
      stats.subjectsCreated++;
    }

    const topicIds = new Map();
    for (const name of [...new Set(QUESTION_SEEDS.map((seed) => seed.topic))]) {
      rows = await db.query("SELECT id FROM topics WHERE subjectId = ? AND name = ?", [subjectId, name]);
      if (rows.length) {
        topicIds.set(name, Number(rows[0].id));
      } else {
        const result = await db.query(
          "INSERT INTO topics (subjectId, name, createdAt, updatedAt) VALUES (?, ?, NOW(), NOW())",
          [subjectId, name],
        );
        topicIds.set(name, Number(result.insertId));
        stats.topicsCreated++;
      }
    }

    const questionIds = [];
    for (const seed of QUESTION_SEEDS) {
      const contentHash = questionContentHash(seed.text, seed.options);
      rows = await db.query(
        "SELECT id FROM questions WHERE subjectId = ? AND contentHash = ? LIMIT 1",
        [subjectId, contentHash],
      );
      if (rows.length) {
        questionIds.push(Number(rows[0].id));
        continue;
      }
      const result = await db.query(
        `INSERT INTO questions
          (subjectId, topicId, userId, type, questionText, options, correctOption, explanation,
           difficulty, status, source, contentHash, reviewedById, reviewedAt, createdAt, updatedAt)
         VALUES (?, ?, NULL, 'MCQ', ?, ?, ?, ?, 'MEDIUM', 'APPROVED', 'MANUAL', ?, ?, NOW(), NOW(), NOW())`,
        [
          subjectId,
          topicIds.get(seed.topic) ?? null,
          seed.text,
          JSON.stringify(seed.options),
          seed.correct,
          seed.explanation,
          contentHash,
          1,
        ],
      );
      questionIds.push(Number(result.insertId));
      stats.questionsCreated++;
    }

    const examTitle = "Computer Science Fundamentals (Demo)";
    rows = await db.query("SELECT id FROM exams WHERE subjectId = ? AND title = ?", [subjectId, examTitle]);
    let examId;
    if (rows.length) {
      examId = Number(rows[0].id);
    } else {
      const now = new Date();
      const result = await db.query(
        `INSERT INTO exams
          (userId, subjectId, title, description, timeLimitMins, durationMinutes, passPercentage,
           marksPerQuestion, negativeMarks, maxAttempts, shuffleQuestions, shuffleOptions,
           reviewPolicy, status, availabilityStart, availabilityEnd, publishedAt, createdAt, updatedAt)
         VALUES (NULL, ?, ?, ?, 30, 30, 60, 1, 0, 2, 0, 0, 'AFTER_SUBMIT', 'PUBLISHED', ?, ?, ?, NOW(), NOW())`,
        [
          subjectId,
          examTitle,
          "A short demo exam generated from the seed question bank. Review answers after submission.",
          new Date(now.getTime() - 24 * 60 * 60 * 1000),
          new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000),
          now,
        ],
      );
      examId = Number(result.insertId);
      stats.examsCreated++;
    }

    for (const [index, questionId] of questionIds.slice(0, 8).entries()) {
      const result = await db.query(
        "INSERT IGNORE INTO exam_questions (examId, questionId, `order`, marks) VALUES (?, ?, ?, 1)",
        [examId, questionId, index + 1],
      );
      stats.examQuestionsCreated += result.affectedRows ?? 0;
    }

    // Shared platform data: no personal owner, so every active user can study it.
    await db.query("UPDATE subjects SET userId = NULL WHERE id = ?", [subjectId]);
    await db.query("UPDATE questions SET userId = NULL WHERE subjectId = ?", [subjectId]);
    await db.query("UPDATE exams SET userId = NULL WHERE id = ?", [examId]);

    console.log(
      JSON.stringify(
        {
          success: true,
          subjectId,
          topicCount: topicIds.size,
          questionCount: questionIds.length,
          examId,
          ...stats,
        },
        null,
        2,
      ),
    );
  } finally {
    await db.end();
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
