'use client';

import { useState } from 'react';
import type { InterviewQuestionData } from '@/types';
import Badge from '@/components/ui/Badge';
import { FormattedText } from '@/components/formatted-text';

type Props = {
  question: InterviewQuestionData;
  onTogglePracticed: (id: number, practiced: boolean) => void;
  onDelete: (id: number) => void;
  onEdit: (question: InterviewQuestionData) => void;
  onRegenerate: (question: InterviewQuestionData) => void;
  regenerating?: boolean;
  answerFontSize?: 'sm' | 'md' | 'lg';
};

const CATEGORY_COLOR: Record<string, 'blue' | 'amber' | 'green' | 'red' | 'slate'> = {
  TECHNICAL: 'blue',
  BEHAVIORAL: 'amber',
  SYSTEM_DESIGN: 'green',
  CODING: 'red',
  HR: 'slate',
};
const COLORS: Array<'blue' | 'amber' | 'green' | 'red' | 'slate'> = ['blue', 'amber', 'green', 'red', 'slate'];

function categoryColor(category: string): 'blue' | 'amber' | 'green' | 'red' | 'slate' {
  if (CATEGORY_COLOR[category]) return CATEGORY_COLOR[category];
  const index = category.split('').reduce((total, char) => total + char.charCodeAt(0), 0) % COLORS.length;
  return COLORS[index];
}

const DIFFICULTY_COLOR: Record<string, 'green' | 'amber' | 'red'> = {
  EASY: 'green',
  MEDIUM: 'amber',
  HARD: 'red',
};

const SOURCE_LABEL: Record<string, string> = {
  MANUAL: '✏️ Manual',
  AI_JD: '✨ AI',
  EXPERIENCE: '💼 Experience',
  MOCK_EXAM: '📚 Mock Exam',
  AI_GUIDE: '📖 Interview Guide',
};

const FONT_CLASS: Record<'sm' | 'md' | 'lg', string> = {
  sm: 'text-sm',
  md: 'text-base',
  lg: 'text-lg',
};

export default function QuestionItem({
  question,
  onTogglePracticed,
  onDelete,
  onEdit,
  onRegenerate,
  regenerating = false,
  answerFontSize = 'md',
}: Props) {
  const [expanded, setExpanded] = useState(false);
  const isReadOnly =
    question.isReadOnly ?? (question.id < 0 || question.source === 'MOCK_EXAM' || question.source === 'AI_GUIDE');

  return (
    <div
      className={`rounded-xl border bg-white p-4 shadow-sm transition-all duration-150 hover:shadow-md sm:p-5 ${
        question.practiced ? 'border-green-200 bg-green-50/40' : 'border-slate-200'
      }`}
    >
      <div className="flex items-start gap-2 sm:gap-3">
        {isReadOnly ? (
          <span className="mt-1 text-base" title="Shared question">📖</span>
        ) : (
          <input
            type="checkbox"
            checked={question.practiced}
            onChange={() => onTogglePracticed(question.id, !question.practiced)}
            className="mt-1 h-4 w-4 rounded text-green-600 cursor-pointer"
            title="Mark as practiced"
          />
        )}

        <div className="min-w-0 flex-1">
          <p
            className="cursor-pointer break-words py-1 text-base font-medium leading-relaxed text-slate-800 hover:text-indigo-700 sm:text-[17px]"
            onClick={() => setExpanded((value) => !value)}
          >
            {question.question}
          </p>

          <div className="mt-3 flex flex-wrap gap-1.5 sm:gap-2">
            <Badge label={question.category.replace(/_/g, ' ')} color={categoryColor(question.category)} />
            {question.subjectName ? <Badge label={question.subjectName} color="blue" /> : null}
            {question.topicName ? <Badge label={question.topicName} color="green" /> : null}
            <Badge label={question.difficulty} color={DIFFICULTY_COLOR[question.difficulty] ?? 'slate'} />
            <Badge label={SOURCE_LABEL[question.source] ?? question.source} color="slate" />
            {isReadOnly ? <Badge label="Shared" color="slate" /> : null}
          </div>

          {expanded && question.whyAsked ? (
            <p className="mt-2 rounded bg-slate-50 p-2 text-xs italic text-slate-600">
              💡 {question.whyAsked}
            </p>
          ) : null}

          {expanded ? (
            <div className="mt-3 rounded-lg border border-indigo-100 bg-indigo-50/50 p-3">
              <p className="text-xs font-semibold uppercase tracking-wide text-indigo-700">
                Interview answer
              </p>

              {question.answer ? (
                <div className={`mt-2 break-words rounded-lg bg-white p-2 shadow-sm ring-1 ring-inset ring-slate-200 sm:p-3 ${FONT_CLASS[answerFontSize]}`}>
                  <FormattedText text={question.answer} />
                </div>
              ) : (
                <p className="mt-2 text-sm text-slate-500">
                  No answer yet. Use “Generate answer” below to create an interview-friendly explanation.
                </p>
              )}

              <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-indigo-100 pt-3">
                <span className="mr-1 text-[11px] font-semibold uppercase tracking-wide text-indigo-500">
                  Actions
                </span>
                <button
                  type="button"
                  onClick={() => onRegenerate(question)}
                  disabled={regenerating}
                  className="inline-flex items-center justify-center gap-1.5 rounded-md bg-white px-3 py-2 text-xs font-medium text-indigo-700 ring-1 ring-inset ring-indigo-200 transition hover:bg-indigo-50 disabled:cursor-not-allowed disabled:opacity-60 sm:text-sm"
                >
                  <span>{regenerating ? '⏳' : '🔄'}</span>
                  {regenerating ? 'Generating…' : question.answer ? 'Regenerate answer' : 'Generate answer'}
                </button>
                {!isReadOnly ? (
                  <button
                    type="button"
                    onClick={() => onEdit(question)}
                    className="inline-flex items-center justify-center gap-1.5 rounded-md bg-white px-3 py-2 text-xs font-medium text-slate-700 ring-1 ring-inset ring-slate-200 transition hover:bg-slate-50 sm:text-sm"
                  >
                    <span>✏️</span> Edit question
                  </button>
                ) : null}
                <button
                  type="button"
                  onClick={() => onDelete(question.id)}
                  className="inline-flex items-center justify-center gap-1.5 rounded-md bg-white px-3 py-2 text-xs font-medium text-red-600 ring-1 ring-inset ring-red-200 transition hover:bg-red-50 sm:text-sm"
                >
                  <span>🗑️</span> {isReadOnly ? 'Delete shared question' : 'Delete'}
                </button>
                {isReadOnly ? (
                  <span className="text-[11px] text-slate-400">Shared — editing disabled</span>
                ) : null}
              </div>
            </div>
          ) : null}

          {expanded && question.options && question.options.length > 0 ? (
            <ul className="mt-3 space-y-1">
              {question.options.map((option) => (
                <li
                  key={option.key}
                  className={`rounded px-2 py-1 text-xs ${
                    option.key === question.correctOption
                      ? 'bg-emerald-50 font-medium text-emerald-800'
                      : 'bg-slate-50 text-slate-600'
                  }`}
                >
                  <span className="font-semibold">{option.key}.</span> {option.text}
                  {option.key === question.correctOption ? ' ✓' : ''}
                </li>
              ))}
            </ul>
          ) : null}
        </div>

        {isReadOnly ? null : (
          <div className="flex flex-shrink-0 flex-col gap-1">
            <button
              type="button"
              onClick={() => onEdit(question)}
              className="rounded p-1.5 text-base text-slate-400 hover:bg-slate-100 hover:text-indigo-500 sm:p-0 sm:text-sm sm:text-slate-300 sm:hover:bg-transparent"
              aria-label="Edit question"
            >
              ✏️
            </button>
            <button
              type="button"
              onClick={() => onDelete(question.id)}
              className="rounded p-1.5 text-base text-slate-400 hover:bg-slate-100 hover:text-red-500 sm:p-0 sm:text-sm sm:text-slate-300 sm:hover:bg-transparent"
              aria-label="Delete question"
            >
              🗑️
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
