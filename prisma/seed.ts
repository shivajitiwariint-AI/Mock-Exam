import bcrypt from "bcryptjs";
import { PrismaClient, type Prisma } from "@prisma/client";
import { questionContentHash } from "../src/lib/question-utils";
import { buildSnapshot } from "../src/lib/exam-service";
import { scoreAttempt } from "../src/lib/scoring";

const prisma = new PrismaClient();

const QUESTION_SEEDS: {
  topic: string;
  text: string;
  options: { key: string; text: string }[];
  correct: string;
  explanation: string;
}[] = [
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

function optionKeyHash(text: string) {
  return text.toLowerCase().replace(/\s+/g, " ").trim();
}

async function main() {
  const isProduction = process.env.NODE_ENV === "production";
  const adminEmail = (process.env.SEED_ADMIN_EMAIL ?? "admin@example.com").toLowerCase();
  const adminPassword =
    process.env.SEED_ADMIN_PASSWORD ??
    (isProduction ? "" : "Admin12345!");
  const adminName = process.env.SEED_ADMIN_NAME ?? "Platform Admin";

  if (!adminPassword) {
    throw new Error("SEED_ADMIN_PASSWORD is required when NODE_ENV=production.");
  }

  const admin = await prisma.user.upsert({
    where: { email: adminEmail },
    update: { name: adminName, role: "SUPER_ADMIN", status: "ACTIVE" },
    create: {
      email: adminEmail,
      name: adminName,
      passwordHash: await bcrypt.hash(adminPassword, 12),
      role: "SUPER_ADMIN",
      status: "ACTIVE",
    },
    select: { id: true, email: true },
  });

  console.log(`Seeded super admin: ${admin.email}`);

  if (process.env.SEED_DEMO !== "true") {
    console.log("SEED_DEMO is not enabled; skipping demo data.");
    return;
  }

  const subjectAdminPassword = process.env.SEED_SUBJECT_ADMIN_PASSWORD ?? "Subject12345!";
  const studentPassword = process.env.SEED_STUDENT_PASSWORD ?? "Student12345!";

  const [subjectAdmin, student] = await Promise.all([
    prisma.user.upsert({
      where: { email: "subjectadmin@example.com" },
      update: { role: "SUBJECT_ADMIN", status: "ACTIVE" },
      create: {
        email: "subjectadmin@example.com",
        name: "Demo Subject Admin",
        passwordHash: await bcrypt.hash(subjectAdminPassword, 12),
        role: "SUBJECT_ADMIN",
        status: "ACTIVE",
      },
      select: { id: true, email: true },
    }),
    prisma.user.upsert({
      where: { email: "student@example.com" },
      update: { status: "ACTIVE" },
      create: {
        email: "student@example.com",
        name: "Demo Student",
        passwordHash: await bcrypt.hash(studentPassword, 12),
        role: "STUDENT",
        status: "ACTIVE",
      },
      select: { id: true, email: true },
    }),
  ]);

  const subject = await prisma.subject.upsert({
    where: { slug: "computer-science-demo" },
    update: { status: "ACTIVE" },
    create: {
      name: "Computer Science (Demo)",
      slug: "computer-science-demo",
      description:
        "Demo subject covering databases, networks, and operating systems. Upload your own PDF/DOCX/TXT study material to try the RAG pipeline.",
      status: "ACTIVE",
    },
    select: { id: true, name: true },
  });

  await prisma.subjectAdmin.upsert({
    where: {
      subjectId_userId: { subjectId: subject.id, userId: subjectAdmin.id },
    },
    update: {},
    create: { subjectId: subject.id, userId: subjectAdmin.id, assignedById: admin.id },
  });

  const topicNames = [...new Set(QUESTION_SEEDS.map((seed) => seed.topic))];
  const topics = new Map<string, string>();
  for (const name of topicNames) {
    const topic = await prisma.topic.upsert({
      where: { subjectId_name: { subjectId: subject.id, name } },
      update: {},
      create: { subjectId: subject.id, name },
      select: { id: true },
    });
    topics.set(name, topic.id);
  }

  const questionIds: string[] = [];
  for (const seed of QUESTION_SEEDS) {
    const contentHash = questionContentHash(seed.text, seed.options);
    const existing = await prisma.question.findFirst({
      where: { subjectId: subject.id, contentHash },
      select: { id: true },
    });
    if (existing) {
      questionIds.push(existing.id);
      continue;
    }
    const question = await prisma.question.create({
      data: {
        subjectId: subject.id,
        topicId: topics.get(seed.topic) ?? null,
        questionText: seed.text,
        options: seed.options as unknown as Prisma.InputJsonValue,
        correctOption: seed.correct,
        explanation: seed.explanation,
        difficulty: "MEDIUM",
        status: "APPROVED",
        source: "MANUAL",
        contentHash,
        createdById: subjectAdmin.id,
        reviewedById: admin.id,
        reviewedAt: new Date(),
      },
      select: { id: true },
    });
    questionIds.push(question.id);
  }

  const now = new Date();
  const start = new Date(now.getTime() - 24 * 60 * 60 * 1000);
  const end = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

  let exam = await prisma.exam.findFirst({
    where: { subjectId: subject.id, title: "Computer Science Fundamentals (Demo)" },
    select: { id: true, title: true },
  });

  if (!exam) {
    exam = await prisma.exam.create({
      data: {
        subjectId: subject.id,
        createdById: subjectAdmin.id,
        title: "Computer Science Fundamentals (Demo)",
        description:
          "A short demo exam generated from the seed question bank. Review answers after submission.",
        durationMinutes: 30,
        passPercentage: 60,
        marksPerQuestion: 1,
        negativeMarks: 0,
        maxAttempts: 2,
        shuffleQuestions: false,
        shuffleOptions: false,
        reviewPolicy: "AFTER_SUBMIT",
        status: "PUBLISHED",
        availabilityStart: start,
        availabilityEnd: end,
        publishedAt: now,
        questions: {
          create: questionIds.slice(0, 8).map((questionId, index) => ({
            questionId,
            order: index + 1,
            marks: 1,
          })),
        },
      },
      select: { id: true, title: true },
    });
    console.log(`Seeded demo exam: ${exam.title}`);
  }

  const existingAttempt = await prisma.examAttempt.findFirst({
    where: { examId: exam.id, studentId: student.id },
    select: { id: true },
  });

  if (!existingAttempt) {
    const examWithQuestions = await prisma.exam.findUniqueOrThrow({
      where: { id: exam.id },
      include: {
        questions: {
          orderBy: { order: "asc" },
          include: {
            question: { include: { topic: { select: { id: true, name: true } } } },
          },
        },
      },
    });

    const startedAt = new Date(now.getTime() - 25 * 60 * 1000);
    const submittedAt = new Date(now.getTime() - 5 * 60 * 1000);

    await prisma.$transaction(async (tx) => {
      const attempt = await tx.examAttempt.create({
        data: {
          examId: exam.id,
          studentId: student.id,
          attemptNumber: 1,
          status: "SUBMITTED",
          startedAt,
          expiresAt: new Date(startedAt.getTime() + examWithQuestions.durationMinutes * 60_000),
          submittedAt,
        },
        select: { id: true },
      });

       const snapshots = examWithQuestions.questions.map((row) => ({
         row,
         snapshot: buildSnapshot({
           ...row.question,
           correctOption: row.question.correctOption ?? "A",
         }),
       }));

      await tx.examAttemptQuestion.createMany({
        data: snapshots.map(({ row, snapshot }, index) => ({
          attemptId: attempt.id,
          questionId: row.questionId,
          order: index + 1,
          marks: row.marks,
          snapshot: snapshot as unknown as Prisma.InputJsonValue,
        })),
      });

      const created = await tx.examAttemptQuestion.findMany({
        where: { attemptId: attempt.id },
        orderBy: { order: "asc" },
        select: { id: true, snapshot: true },
      });

      const selected: { attemptQuestionId: string; selectedOption: string | null }[] = [];
      created.forEach((row, index) => {
        const snapshot = row.snapshot as { correctOption?: string; options?: { key: string }[] };
        const options = snapshot.options ?? [];
        const correct = snapshot.correctOption;
        let selectedOption: string | null = null;
        if (index % 5 !== 4 && correct) {
          selectedOption =
            index % 3 === 0
              ? options.find((option) => option.key !== correct)?.key ?? correct
              : correct;
        }
        selected.push({ attemptQuestionId: row.id, selectedOption });
      });

      await tx.studentAnswer.createMany({
        data: selected.map((answer) => ({
          attemptId: attempt.id,
          attemptQuestionId: answer.attemptQuestionId,
          selectedOption: answer.selectedOption,
        })),
      });

      const scoring = scoreAttempt(
        selected.map((answer, index) => ({
          marks: created[index] ? 1 : 1,
          correctOption:
            (created[index].snapshot as { correctOption: string }).correctOption,
          selectedOption: answer.selectedOption,
        })),
        { passPercentage: examWithQuestions.passPercentage, negativeMarks: examWithQuestions.negativeMarks },
      );

      await tx.examResult.create({
        data: {
          attemptId: attempt.id,
          score: scoring.score,
          maxScore: scoring.maxScore,
          percentage: scoring.percentage,
          correctCount: scoring.correctCount,
          incorrectCount: scoring.incorrectCount,
          unansweredCount: scoring.unansweredCount,
          passed: scoring.passed,
          timeTakenSeconds: 20 * 60,
        },
      });
    });

    console.log(`Seeded demo attempt for ${student.email}`);
  }

  console.log("Demo seed complete.", {
    subject: subject.name,
    questions: questionIds.length,
    logins: {
      superAdmin: admin.email,
      subjectAdmin: subjectAdmin.email,
      student: student.email,
    },
  });
  console.log(
    `Demo passwords: subject admin = ${subjectAdminPassword}, student = ${studentPassword}`,
  );
  console.log(`Question seed preview: ${optionKeyHash("Demo")}`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
