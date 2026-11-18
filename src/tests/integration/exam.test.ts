import { describe, it, expect, beforeEach } from 'vitest';
import { prisma } from '../../lib/db';
import { startExamAttempt, finalizeAttempt } from '../../lib/exam-service';

describe('Exam Lifecycle Integration', () => {
  let studentId: string;
  let examId: string;

  beforeEach(async () => {
    // Setup clean state for testing
    const student = await prisma.user.create({
      data: {
        email: `test-student-${Date.now()}@example.com`,
        name: 'Test Student',
        passwordHash: 'hashed',
        role: 'STUDENT',
        status: 'ACTIVE',
      },
    });
    studentId = student.id;

    const subject = await prisma.subject.create({
      data: {
        name: 'Test Subject',
        slug: `test-subject-${Date.now()}`,
        status: 'ACTIVE',
      },
    });

    const admin = await prisma.user.create({
      data: {
        email: `test-admin-${Date.now()}@example.com`,
        name: 'Test Admin',
        passwordHash: 'hashed',
        role: 'SUPER_ADMIN',
        status: 'ACTIVE',
      },
    });

    const question = await prisma.question.create({
      data: {
        subjectId: subject.id,
        questionText: 'What is 2+2?',
        options: [{ key: 'A', text: '3' }, { key: 'B', text: '4' }, { key: 'C', text: '5' }, { key: 'D', text: '6' }],
        correctOption: 'B',
        explanation: 'Basic math',
        difficulty: 'EASY',
        status: 'APPROVED',
        source: 'MANUAL',
        contentHash: 'hash-1',
        createdById: admin.id,
      },
    });

    const exam = await prisma.exam.create({
      data: {
        subject: { connect: { id: subject.id } },
        createdBy: { connect: { id: admin.id } },
        title: 'Test Exam',
        durationMinutes: 30,
        passPercentage: 50,
        maxAttempts: 1,
        status: 'PUBLISHED',
        availabilityStart: new Date(Date.now() - 1000),
        availabilityEnd: new Date(Date.now() + 100000),
        questions: {
          create: [{ questionId: question.id, order: 1, marks: 1 }],
        },
      },
    });
    examId = exam.id;
  });

  it('should allow a student to start an exam and finalize it', async () => {
    const view = await startExamAttempt(examId, studentId);
    expect(view.exam.id).toBe(examId);
    expect(view.questions.length).toBe(1);

    // Mocking the result of finalize
    const result = await finalizeAttempt(view.attempt.id, studentId);
    expect(result).toBeDefined();
    expect(result.percentage).toBeDefined();
  });
});
