export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import type { Prisma } from '@/app/generated/prisma/client';
import { prisma } from '@/lib/prisma';
import { getUserFromRequest } from '@/lib/auth';
import { createQuestionSchema } from '@/lib/validations/interview.schema';

type MockQuestionOption = { key: string; text: string };
type SourceFilter = 'all' | 'interview' | 'guide' | 'mock' | null;
type SortOption = 'default' | 'hard-first' | 'easy-first' | 'az';

const DIFFICULTY_RANK: Record<string, number> = { EASY: 1, MEDIUM: 2, HARD: 3 };

function byNewest(a: { createdAt: string }, b: { createdAt: string }): number {
  return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
}

function sortQuestions<T extends { createdAt: string; difficulty: string; question: string }>(
  items: T[],
  sort: SortOption,
): T[] {
  if (sort === 'hard-first') {
    return items.sort(
      (a, b) =>
        (DIFFICULTY_RANK[b.difficulty] ?? 0) - (DIFFICULTY_RANK[a.difficulty] ?? 0) ||
        byNewest(a, b),
    );
  }
  if (sort === 'easy-first') {
    return items.sort(
      (a, b) =>
        (DIFFICULTY_RANK[a.difficulty] ?? 4) - (DIFFICULTY_RANK[b.difficulty] ?? 4) ||
        byNewest(a, b),
    );
  }
  if (sort === 'az') {
    return items.sort((a, b) => a.question.localeCompare(b.question) || byNewest(a, b));
  }
  return items.sort(byNewest);
}

function asOptions(value: unknown): MockQuestionOption[] {
  if (!Array.isArray(value)) return [];
  return value
    .filter(
      (option): option is MockQuestionOption =>
        Boolean(
          option &&
            typeof option === 'object' &&
            'key' in option &&
            'text' in option &&
            typeof (option as MockQuestionOption).key === 'string' &&
            typeof (option as MockQuestionOption).text === 'string',
        ),
    )
    .map((option) => ({ key: option.key, text: option.text }));
}

function intParam(searchParams: URLSearchParams, key: string): number | undefined {
  const raw = searchParams.get(key);
  if (!raw) return undefined;
  const value = Number(raw);
  return Number.isFinite(value) && value > 0 ? value : undefined;
}

function toIso(value: Date | string): string {
  return value instanceof Date ? value.toISOString() : String(value);
}

function guideCategory(subjectName: string, topicName: string | null): string {
  const text = `${subjectName} ${topicName ?? ''}`.toLowerCase();
  if (/hr|leadership|behavioral|project experience|communication/.test(text)) return 'BEHAVIORAL';
  if (/system design|architecture|distributed|scalab/.test(text)) return 'SYSTEM_DESIGN';
  if (/coding|hands-on|algorithm|dsa|programming/.test(text)) return 'CODING';
  return 'TECHNICAL';
}

function countBy<T>(items: T[], key: (item: T) => string | number | null): Map<string, number> {
  const counts = new Map<string, number>();
  for (const item of items) {
    const value = key(item);
    if (value === null || value === undefined || value === '') continue;
    const label = String(value);
    counts.set(label, (counts.get(label) ?? 0) + 1);
  }
  return counts;
}

export async function GET(request: NextRequest) {
  const user = await getUserFromRequest(request);
  const { searchParams } = new URL(request.url);

  const page = Math.max(1, intParam(searchParams, 'page') ?? 1);
  const pageSize = Math.min(100, Math.max(1, intParam(searchParams, 'pageSize') ?? 20));
  const companyId = intParam(searchParams, 'companyId');
  const jdId = intParam(searchParams, 'jdId');
  const subjectId = intParam(searchParams, 'subjectId');
  const topicId = intParam(searchParams, 'topicId');
  const category = searchParams.get('category') || null;
  const rawDifficulty = searchParams.get('difficulty');
  const difficulty =
    rawDifficulty === 'EASY' || rawDifficulty === 'MEDIUM' || rawDifficulty === 'HARD'
      ? rawDifficulty
      : null;
  const practiced = searchParams.get('practiced');
  const search = searchParams.get('search')?.trim() || '';
  const source = searchParams.get('source') as SourceFilter;
  const companyScope = searchParams.get('companyScope') as 'general' | 'company' | null;
  const all = searchParams.get('all') === 'true';
  const rawSort = searchParams.get('sort');
  const sort: SortOption =
    rawSort === 'hard-first' || rawSort === 'easy-first' || rawSort === 'az'
      ? rawSort
      : 'default';

  const isAdmin = user.isAdmin === true || user.role === 'SUPER_ADMIN';
  const subjectWhere: Prisma.SubjectWhereInput = isAdmin
    ? {}
    : { status: 'ACTIVE', OR: [{ userId: null }, { userId: user.userId }] };

  // Load the full visible question set once. Facets are computed from this
  // unfiltered set so the left filter panel never shrinks when a filter is
  // active; filters are applied afterwards only to the result list.
  const interviewWhere: Prisma.InterviewBankQuestionWhereInput = { userId: user.userId };
  const bankWhere: Prisma.QuestionWhereInput = { status: 'APPROVED', subject: subjectWhere };

  const [interviewRows, bankRows, subjects] = await Promise.all([
    prisma.interviewBankQuestion.findMany({
      where: interviewWhere,
      include: {
        company: { select: { id: true, name: true } },
        jd: { select: { id: true, role: true } },
      },
      orderBy: { createdAt: 'desc' },
    }),
    prisma.question.findMany({
      where: bankWhere,
      include: {
        subject: { select: { id: true, name: true, slug: true } },
        topic: { select: { id: true, name: true } },
      },
      orderBy: { createdAt: 'desc' },
    }),
    prisma.subject.findMany({
      where: subjectWhere,
      orderBy: { name: 'asc' },
      select: {
        id: true,
        name: true,
        topics: { orderBy: { name: 'asc' }, select: { id: true, name: true } },
      },
    }),
  ]);

  const interviewMapped = interviewRows.map((question) => ({
    id: question.id,
    userId: question.userId,
    companyId: question.companyId,
    companyName: question.company?.name ?? null,
    jdId: question.jdId,
    source: question.source,
    category: question.category,
    question: question.question,
    answer: question.answer,
    difficulty: question.difficulty,
    whyAsked: question.whyAsked,
    practiced: question.practiced,
    createdAt: toIso(question.createdAt),
    updatedAt: toIso(question.updatedAt),
    subjectId: null,
    subjectName: null,
    topicId: null,
    topicName: null,
    options: [],
    correctOption: null,
    explanation: null,
    isReadOnly: false,
  }));

  const bankMapped = bankRows.map((question) => {
    const options = asOptions(question.options);
    const subjectName = question.subject?.name ?? 'Shared';
    const isGuide = Boolean(question.subject?.slug?.startsWith('guide-'));
    const correct = options.find((option) => option.key === question.correctOption);
    const answer = isGuide
      ? question.explanation ?? ''
      : [correct ? `Correct answer: ${correct.key}. ${correct.text}` : '', question.explanation ?? '']
          .filter(Boolean)
          .join('\n\n');

    // Negative IDs mark shared question-bank rows as read-only in the UI.
    return {
      id: -question.id,
      userId: user.userId,
      companyId: null,
      jdId: null,
      source: (isGuide ? 'AI_GUIDE' : 'MOCK_EXAM') as 'AI_GUIDE' | 'MOCK_EXAM',
      category: isGuide
        ? guideCategory(subjectName, question.topic?.name ?? null)
        : 'TECHNICAL',
      question: question.questionText,
      answer: answer || null,
      difficulty: question.difficulty,
      whyAsked: isGuide ? 'Interview-friendly answer generated from the source guide' : question.topic?.name ?? subjectName,
      practiced: false,
      createdAt: toIso(question.createdAt),
      updatedAt: toIso(question.updatedAt),
      subjectId: question.subject?.id ?? null,
      subjectName: question.subject?.name ?? null,
      topicId: question.topic?.id ?? null,
      topicName: question.topic?.name ?? null,
      options: isGuide ? [] : options,
      correctOption: question.correctOption,
      explanation: question.explanation,
      isReadOnly: true,
    };
  });

  const allQuestions = [...interviewMapped, ...bankMapped]
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  const subjectNames = new Map<string, string>();
  const topicNames = new Map<string, string>();
  const companyNames = new Map<string, string>();
  for (const question of allQuestions) {
    if (question.subjectId != null && question.subjectName) subjectNames.set(String(question.subjectId), question.subjectName);
    if (question.topicId != null && question.topicName) topicNames.set(String(question.topicId), question.topicName);
    if (question.companyId != null && question.companyName) companyNames.set(String(question.companyId), question.companyName);
  }

  // Facets come from the full unfiltered set so the left panel keeps all
  // options and their global counts while any filter is active.
  const facets = {
    sources: [...countBy(allQuestions, (question) => question.source)]
      .map(([value, count]) => ({ value, count }))
      .sort((a, b) => b.count - a.count),
    subjects: [...countBy(allQuestions, (question) => question.subjectId)]
      .map(([id, count]) => ({ id: Number(id), name: subjectNames.get(id) ?? 'Unknown', count }))
      .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name)),
    topics: [...countBy(allQuestions, (question) => question.topicId)]
      .map(([id, count]) => {
        const question = allQuestions.find((item) => String(item.topicId) === id);
        return {
          id: Number(id),
          name: topicNames.get(id) ?? 'General',
          subjectId: question?.subjectId ?? null,
          subjectName: question?.subjectName ?? null,
          count,
        };
      })
      .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name)),
    categories: [...countBy(allQuestions, (question) => question.category)]
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name)),
    companies: [...countBy(allQuestions, (question) => question.companyId)]
      .map(([id, count]) => ({ id: Number(id), name: companyNames.get(id) ?? 'Unknown', count }))
      .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name)),
  };

  const searchText = search.toLowerCase();
  const filteredQuestions = allQuestions.filter((question) => {
    if (source === 'interview' && question.isReadOnly) return false;
    if (source === 'guide' && question.source !== 'AI_GUIDE') return false;
    if (source === 'mock' && question.source !== 'MOCK_EXAM') return false;

    // Subject and topic belong to shared guide/mock questions only.
    if (!question.isReadOnly && (subjectId || topicId) && source !== 'interview') return false;
    if (subjectId && question.isReadOnly && String(question.subjectId) !== String(subjectId)) return false;
    if (topicId && question.isReadOnly && String(question.topicId) !== String(topicId)) return false;

    if (companyId && question.companyId !== companyId) return false;
    if (!companyId && companyScope === 'general' && question.companyId != null) return false;
    if (!companyId && companyScope === 'company' && question.companyId == null) return false;
    if (jdId && !question.isReadOnly && question.jdId !== jdId) return false;
    if (category && question.category !== category) return false;
    if (difficulty && question.difficulty !== difficulty) return false;
    if (practiced === 'true' && !question.isReadOnly && !question.practiced) return false;
    if (practiced === 'false' && !question.isReadOnly && question.practiced) return false;

    if (searchText) {
      const haystack = [question.question, question.answer, question.category, question.whyAsked]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();
      if (!haystack.includes(searchText)) return false;
    }
    return true;
  });

  const sortedQuestions = sortQuestions(filteredQuestions, sort);
  const total = sortedQuestions.length;
  const totalPages = all ? 1 : Math.max(1, Math.ceil(total / pageSize));
  const start = all ? 0 : (page - 1) * pageSize;
  const questions = all ? sortedQuestions : sortedQuestions.slice(start, start + pageSize);
  const practicedCount = interviewMapped.filter((question) => question.practiced).length;

  return NextResponse.json({
    questions,
    subjects,
    facets,
    pagination: { page, pageSize, total, totalPages },
    practicedCount,
  });
}

export async function POST(request: NextRequest) {
  const user = await getUserFromRequest(request);

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const result = createQuestionSchema.safeParse(body);
  if (!result.success) return NextResponse.json({ error: 'Validation failed' }, { status: 400 });

  const question = await prisma.interviewBankQuestion.create({
    data: { ...result.data, userId: user.userId, source: 'MANUAL' },
  });

  return NextResponse.json({ question }, { status: 201 });
}
