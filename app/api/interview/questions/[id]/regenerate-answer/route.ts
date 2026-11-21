export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getUserFromRequest } from '@/lib/auth';
import { generateChatCompletion, llmConfigured } from '@/lib/llm';

type Option = { key: string; text: string };

function asOptions(value: unknown): Option[] {
  if (!Array.isArray(value)) return [];
  return value
    .filter(
      (option): option is Option =>
        Boolean(
          option &&
            typeof option === 'object' &&
            'key' in option &&
            'text' in option &&
            typeof (option as Option).key === 'string' &&
            typeof (option as Option).text === 'string',
        ),
    )
    .map((option) => ({ key: option.key, text: option.text }));
}

function truncate(value: string | null | undefined, max = 6000): string {
  if (!value) return '';
  return value.length > max ? `${value.slice(0, max)}…` : value;
}

async function regenerate(input: {
  question: string;
  topic: string;
  existingAnswer: string;
  correctAnswer?: string;
}): Promise<string> {
  const system = [
    'You are a senior interviewer and communication coach.',
    'Rewrite the question into a complete answer that a candidate can say aloud in an interview.',
    'Use simple English, short paragraphs and a natural spoken tone.',
    'Structure the answer as:',
    '1) one-sentence direct answer,',
    '2) easy explanation with a concrete example,',
    '3) important trade-offs or mistakes to avoid,',
    '4) one short interview tip.',
    'Be detailed but speakable, about 250-400 words. Do not use tables.',
    'Do not mention that you are rewriting an existing answer. Return plain text only.',
  ].join(' ');

  const user = [
    `Question: ${input.question}`,
    `Topic: ${input.topic || 'General'}`,
    input.correctAnswer ? `Correct option: ${input.correctAnswer}` : '',
    `Source answer for reference:\n${truncate(input.existingAnswer)}`,
    'Write a fresh, detailed, interview-friendly answer. Keep the technical meaning accurate.',
  ]
    .filter(Boolean)
    .join('\n\n');

  const answer = await generateChatCompletion({
    system,
    user,
    maxTokens: 1600,
    temperature: 0.5,
  });

  // Keep answers as plain, speakable text — strip markdown emphasis markers.
  return answer.trim().replace(/\*\*(.+?)\*\*/g, '$1').replace(/__(.+?)__/g, '$1');
}

export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  const user = await getUserFromRequest(request);
  const id = Number(params.id);
  if (!Number.isFinite(id) || id === 0) {
    return NextResponse.json({ error: 'Invalid question id' }, { status: 400 });
  }

  if (!llmConfigured()) {
    return NextResponse.json(
      { error: 'AI answer generation is not configured. Add GROQ_API_KEY to the environment.' },
      { status: 503 },
    );
  }

  try {
    // Negative IDs are shared question-bank rows shown on /interview/questions.
    if (id < 0) {
      const bankQuestion = await prisma.question.findUnique({
        where: { id: -id },
        include: {
          subject: { select: { id: true, name: true, userId: true, status: true } },
          topic: { select: { name: true } },
        },
      });
      if (!bankQuestion) {
        return NextResponse.json({ error: 'Question not found' }, { status: 404 });
      }

      const isAdmin = user.isAdmin === true || user.role === 'SUPER_ADMIN';
      const subject = bankQuestion.subject;
      const allowed =
        isAdmin ||
        !subject ||
        subject.userId === null ||
        subject.userId === user.userId ||
        subject.status === 'ACTIVE';
      if (!allowed) {
        return NextResponse.json({ error: 'Question not found' }, { status: 404 });
      }

      const options = asOptions(bankQuestion.options);
      const correct = options.find((option) => option.key === bankQuestion.correctOption);
      const answer = await regenerate({
        question: bankQuestion.questionText,
        topic: bankQuestion.topic?.name ?? subject?.name ?? '',
        existingAnswer: bankQuestion.explanation ?? '',
        correctAnswer: correct ? `${correct.key}. ${correct.text}` : undefined,
      });

      await prisma.question.update({
        where: { id: bankQuestion.id },
        data: { explanation: answer },
      });

      return NextResponse.json({ answer, questionId: id });
    }

    const ownQuestion = await prisma.interviewBankQuestion.findFirst({
      where: { id, userId: user.userId },
    });
    if (!ownQuestion) {
      return NextResponse.json({ error: 'Question not found' }, { status: 404 });
    }

    const answer = await regenerate({
      question: ownQuestion.question,
      topic: ownQuestion.category,
      existingAnswer: ownQuestion.answer ?? '',
    });

    await prisma.interviewBankQuestion.update({
      where: { id },
      data: { answer },
    });

    return NextResponse.json({ answer, questionId: id });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : 'The answer could not be regenerated right now.';
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
