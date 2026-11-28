'use client'

import { useState, useEffect, useCallback, useMemo, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import type {
  InterviewQuestionData,
  InterviewQuestionsResponse,
  InterviewQuestionFacets,
  CompanyData,
  InterviewCategoryData,
} from '@/types'
import QuestionItem from '@/components/interview/QuestionItem'
import Button from '@/components/ui/Button'
import Skeleton from '@/components/ui/Skeleton'
import Modal from '@/components/ui/Modal'
import { useCurrentUser } from '@/lib/use-current-user'
import jsPDF from 'jspdf'

type GroupBy = 'none' | 'subject' | 'topic' | 'company' | 'category'
type SortBy = 'default' | 'hard-first' | 'easy-first' | 'az'
type DifficultyFilter = 'all' | 'EASY' | 'MEDIUM' | 'HARD'

type QuestionGroup = {
  key: string
  label: string
  count: number
  questions: InterviewQuestionData[]
}

function buildGroups(questions: InterviewQuestionData[], groupBy: GroupBy): QuestionGroup[] {
  if (groupBy === 'none') return []
  const map = new Map<string, { label: string; questions: InterviewQuestionData[] }>()
  for (const question of questions) {
    let key: string
    let label: string
    if (groupBy === 'subject') {
      key = question.subjectId != null ? `s-${question.subjectId}` : 's-own'
      label = question.subjectName ?? 'My Questions / General'
    } else if (groupBy === 'topic') {
      key = question.topicId != null ? `t-${question.topicId}` : question.companyId != null ? `c-${question.companyId}` : 't-own'
      label = question.topicName
        ? `${question.subjectName ?? ''} › ${question.topicName}`
        : question.companyName ? `Company: ${question.companyName}` : 'General'
    } else if (groupBy === 'company') {
      key = question.companyId != null ? `c-${question.companyId}` : 'c-none'
      label = question.companyName ?? 'No company'
    } else {
      key = question.category || 'UNCATEGORIZED'
      label = (question.category || 'Uncategorized').replace(/_/g, ' ')
    }
    const entry = map.get(key) ?? { label, questions: [] }
    entry.questions.push(question)
    map.set(key, entry)
  }
  return [...map.entries()]
    .map(([key, value]) => ({ key, label: value.label, count: value.questions.length, questions: value.questions }))
    .sort((a, b) => b.count - a.count || a.label.localeCompare(b.label))
}

function QuestionsContent() {
  const searchParams = useSearchParams()
  const jdId = searchParams.get('jdId')
  const practicedFilter = searchParams.get('practiced')
  const { isSuperAdmin } = useCurrentUser()

  const [questions, setQuestions] = useState<InterviewQuestionData[]>([])
  const [companies, setCompanies] = useState<CompanyData[]>([])
  const [categories, setCategories] = useState<InterviewCategoryData[]>([])
  const [pagination, setPagination] = useState({ page: 1, pageSize: 20, total: 0, totalPages: 1 })
  const [totalPracticed, setTotalPracticed] = useState(0)
  const [isLoading, setIsLoading] = useState(true)
  const [showAddModal, setShowAddModal] = useState(false)
  const [downloadingPdf, setDownloadingPdf] = useState(false)
  const [showCategoryModal, setShowCategoryModal] = useState(false)
  const [editingQuestion, setEditingQuestion] = useState<InterviewQuestionData | null>(null)
  const [typeFilter, setTypeFilter] = useState<'all' | 'general' | 'company'>('all')
  const [companyFilter, setCompanyFilter] = useState('')
  const [sourceFilter, setSourceFilter] = useState<'all' | 'interview' | 'guide' | 'mock'>('all')
  const [categoryFilter, setCategoryFilter] = useState('')
  const [subjectFilter, setSubjectFilter] = useState('')
  const [topicFilter, setTopicFilter] = useState('')
  const [page, setPage] = useState(1)
  const [searchInput, setSearchInput] = useState('')
  const [search, setSearch] = useState('')
  const [answerFontSize, setAnswerFontSize] = useState<'sm' | 'md' | 'lg'>('md')
  const [sortBy, setSortBy] = useState<SortBy>('default')
  const [difficultyFilter, setDifficultyFilter] = useState<DifficultyFilter>('all')
  const [regeneratingId, setRegeneratingId] = useState<number | null>(null)
  const [notice, setNotice] = useState('')
  const [noticeType, setNoticeType] = useState<'success' | 'error'>('error')
  const [facets, setFacets] = useState<InterviewQuestionFacets | null>(null)
  const groupBy: GroupBy = 'none'
  const [collapsedGroups, setCollapsedGroups] = useState<Record<string, boolean>>({})

  // Category management state
  const [newCatName, setNewCatName] = useState('')
  const [newCatColor, setNewCatColor] = useState<string>('blue')
  const [catSaving, setCatSaving] = useState(false)

  // Add/Edit question form state
  const [qText, setQText] = useState('')
  const [qCategory, setQCategory] = useState<string>('TECHNICAL')
  const [qDifficulty, setQDifficulty] = useState<string>('MEDIUM')
  const [qAnswer, setQAnswer] = useState('')
  const [qWhyAsked, setQWhyAsked] = useState('')
  const [qCompanyId, setQCompanyId] = useState('')
  const [saving, setSaving] = useState(false)
  const [qSubjectId, setQSubjectId] = useState('')
  const [qTopicId, setQTopicId] = useState('')

  const selectedSubject = (facets?.subjects ?? []).find((s) => String(s.id) === qSubjectId) ?? null

  const loadCategories = useCallback(async () => {
    const res = await fetch('/api/interview/categories')
    const data = await res.json() as { categories: InterviewCategoryData[] }
    setCategories(data.categories ?? [])
  }, [])

  const load = useCallback(async () => {
    setIsLoading(true)
    const params = new URLSearchParams({ page: String(page), pageSize: '20' })
    if (jdId) params.set('jdId', jdId)
    if (practicedFilter) params.set('practiced', practicedFilter)
    if (typeFilter !== 'all') params.set('companyScope', typeFilter)
    if (companyFilter) params.set('companyId', companyFilter)
    if (sourceFilter !== 'all') params.set('source', sourceFilter)
    if (categoryFilter) params.set('category', categoryFilter)
    if (subjectFilter) params.set('subjectId', subjectFilter)
    if (topicFilter) params.set('topicId', topicFilter)
    if (search) params.set('search', search)
    if (difficultyFilter !== 'all') params.set('difficulty', difficultyFilter)
    if (sortBy !== 'default') params.set('sort', sortBy)
    if (groupBy !== 'none') params.set('all', 'true')
    const [qRes, cRes] = await Promise.all([
      fetch(`/api/interview/questions?${params.toString()}`),
      fetch('/api/interview/companies'),
    ])
    const qData = await qRes.json() as InterviewQuestionsResponse
    const cData = await cRes.json() as { companies: CompanyData[] }
    setQuestions(qData.questions ?? [])
    setFacets(qData.facets ?? null)
    setPagination(qData.pagination ?? { page, pageSize: 20, total: 0, totalPages: 1 })
    setTotalPracticed(qData.practicedCount ?? 0)
    setCompanies(cData.companies ?? [])
    setIsLoading(false)
  }, [jdId, practicedFilter, typeFilter, companyFilter, sourceFilter, categoryFilter, subjectFilter, topicFilter, page, search, difficultyFilter, sortBy, groupBy])

  useEffect(() => { void load() }, [load])
  useEffect(() => { void loadCategories() }, [loadCategories])

  const handleTogglePracticed = async (id: number, practiced: boolean) => {
    if (id < 0) return
    await fetch(`/api/interview/questions/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ practiced }),
    })
    setQuestions((prev) => prev.map((q) => q.id === id ? { ...q, practiced } : q))
  }

  const handleDelete = async (id: number) => {
    const isShared = id < 0
    const message = isShared
      ? 'Remove this shared question from the bank? It will no longer appear for anyone. This cannot be undone.'
      : 'Delete this question? This cannot be undone.'
    if (!confirm(message)) return
    try {
      const res = await fetch(`/api/interview/questions/${id}`, { method: 'DELETE' })
      if (!res.ok) {
        const data = await res.json().catch(() => ({})) as { error?: string }
        throw new Error(data.error ?? 'The question could not be deleted.')
      }
      setQuestions((prev) => prev.filter((q) => q.id !== id))
      setNoticeType('success')
      setNotice(isShared ? 'Shared question removed from the bank.' : 'Question deleted.')
    } catch (error) {
      setNoticeType('error')
      setNotice(error instanceof Error ? error.message : 'The question could not be deleted.')
    }
  }

  const handleRegenerate = async (question: InterviewQuestionData) => {
    setNotice('')
    setNoticeType('error')
    setRegeneratingId(question.id)
    try {
      const res = await fetch(`/api/interview/questions/${question.id}/regenerate-answer`, {
        method: 'POST',
      })
      const data = await res.json() as { answer?: string; questionId?: number; error?: string }
      if (!res.ok || !data.answer) {
        throw new Error(data.error ?? 'The answer could not be regenerated.')
      }
      setQuestions((prev) => prev.map((q) => q.id === question.id ? { ...q, answer: data.answer!, explanation: data.answer! } : q))
      setNoticeType('success')
      setNotice('Answer regenerated. Review it below and edit if needed.')
    } catch (error) {
      setNoticeType('error')
      setNotice(error instanceof Error ? error.message : 'The answer could not be regenerated.')
    } finally {
      setRegeneratingId(null)
    }
  }

  const handleSaveAnswer = async (question: InterviewQuestionData, answer: string) => {
    const trimmed = answer.trim()
    if (!trimmed || question.id < 0) return
    try {
      const res = await fetch(`/api/interview/questions/${question.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ answer: trimmed }),
      })
      if (!res.ok) {
        const data = await res.json().catch(() => ({})) as { error?: string }
        throw new Error(data.error ?? 'The answer could not be saved.')
      }
      const data = await res.json() as { question?: InterviewQuestionData }
      const updatedAnswer = data.question?.answer ?? trimmed
      setQuestions((prev) => prev.map((q) => (q.id === question.id ? { ...q, answer: updatedAnswer, explanation: updatedAnswer } : q)))
      setNoticeType('success')
      setNotice('Answer saved.')
    } catch (error) {
      setNoticeType('error')
      setNotice(error instanceof Error ? error.message : 'The answer could not be saved.')
    }
  }

  const [selectedQuestions, setSelectedQuestions] = useState<Record<number, boolean>>({});
  const [bulkDeleteBusy, setBulkDeleteBusy] = useState(false);

  const selectedQuestionsList = questions.filter((q) => selectedQuestions[q.id]);

  async function bulkDeleteSelected() {
    const targets = selectedQuestionsList;
    if (targets.length === 0) return;
    if (
      !window.confirm(
        `Delete ${targets.length} question(s)? Shared questions will be archived and your own questions will be removed.`,
      )
    ) {
      return;
    }
    setBulkDeleteBusy(true);
    setNotice('');
    setNoticeType('error');
    for (const question of targets) {
      try {
        await handleDelete(question.id);
      } catch {
        // Keep deleting the rest even if one question fails.
      }
    }
    setSelectedQuestions({});
    setBulkDeleteBusy(false);
    await load();
  }

  const handleOpenEdit = (q: InterviewQuestionData) => {
    if (!q || q.id < 0) return
    setEditingQuestion(q)
    setQText(q.question)
    setQCategory(q.category)
    setQDifficulty(q.difficulty)
    setQAnswer(q.answer ?? '')
    setQWhyAsked(q.whyAsked ?? '')
    setQCompanyId(q.companyId ? String(q.companyId) : '')
  }

  const handleSaveEdit = async () => {
    if (!editingQuestion || !qText.trim()) return
    setSaving(true)
    setNotice('')
    const body: Record<string, unknown> = {
      question: qText.trim(),
      category: qCategory,
      difficulty: qDifficulty,
      answer: qAnswer.trim() || null,
      whyAsked: qWhyAsked.trim() || null,
      companyId: qCompanyId ? parseInt(qCompanyId, 10) : null,
    }
    try {
      const res = await fetch(`/api/interview/questions/${editingQuestion.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      if (!res.ok) throw new Error('The question could not be saved.')
      const data = await res.json() as { question: InterviewQuestionData }
      setQuestions((prev) => prev.map((q) => q.id === editingQuestion.id ? data.question : q))
      setEditingQuestion(null)
      setNoticeType('success')
      setNotice('Question updated.')
    } catch (error) {
      setNoticeType('error')
      setNotice(error instanceof Error ? error.message : 'The question could not be saved.')
    } finally {
      setSaving(false)
    }
  }

  const handleAddCategory = async () => {
    if (!newCatName.trim()) return
    setCatSaving(true)
    const res = await fetch('/api/interview/categories', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: newCatName.trim(), color: newCatColor }),
    })
    if (res.ok) {
      const data = await res.json() as { category: InterviewCategoryData }
      setCategories((prev) => [...prev, data.category].sort((a, b) => a.name.localeCompare(b.name)))
      setNewCatName('')
      setNewCatColor('blue')
    }
    setCatSaving(false)
  }

  const handleDeleteCategory = async (id: number) => {
    if (!confirm('Delete this category? Questions using it will keep their current category value.')) return
    await fetch(`/api/interview/categories/${id}`, { method: 'DELETE' })
    setCategories((prev) => prev.filter((c) => c.id !== id))
  }

  const handleAddQuestion = async () => {
    if (!qText.trim()) return
    setSaving(true)
    setNotice('')
    const body: Record<string, unknown> = {
      question: qText.trim(),
      category: selectedSubject?.name ?? qCategory,
      difficulty: qDifficulty,
    }
    if (qAnswer.trim()) body.answer = qAnswer.trim()
    if (qCompanyId) body.companyId = parseInt(qCompanyId, 10)

    try {
      const res = await fetch('/api/interview/questions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      if (!res.ok) throw new Error('The question could not be added.')
      setQText(''); setQAnswer(''); setQCompanyId('')
      setShowAddModal(false)
      setPage(1)
      await load()
      setNoticeType('success')
      setNotice('Question added.')
    } catch (error) {
      setNoticeType('error')
      setNotice(error instanceof Error ? error.message : 'The question could not be added.')
    } finally {
      setSaving(false)
    }
  }

  const handleDownloadPdf = async () => {
    setDownloadingPdf(true)
    try {
      const params = new URLSearchParams({ page: '1', pageSize: '20', all: 'true' })
      if (jdId) params.set('jdId', jdId)
      if (practicedFilter) params.set('practiced', practicedFilter)
      if (typeFilter !== 'all') params.set('companyScope', typeFilter)
      if (companyFilter) params.set('companyId', companyFilter)
      if (search) params.set('search', search)
      if (difficultyFilter !== 'all') params.set('difficulty', difficultyFilter)
      if (sortBy !== 'default') params.set('sort', sortBy)
      if (subjectFilter) params.set('subjectId', subjectFilter)
      const res = await fetch(`/api/interview/questions?${params.toString()}`)
      const data = await res.json() as InterviewQuestionsResponse
      const qs = data.questions ?? []
      if (qs.length === 0) {
        setNoticeType('error')
        setNotice('No questions to download.')
        return
      }

      const doc = new jsPDF({ orientation: 'portrait', unit: 'pt', format: 'a4' })
      const pageWidth = doc.internal.pageSize.getWidth()
      const pageHeight = doc.internal.pageSize.getHeight()
      const margin = 48
      const contentWidth = pageWidth - margin * 2

      // ---------- Cover / title block ----------
      doc.setFillColor(79, 70, 229)
      doc.rect(0, 0, pageWidth, 96, 'F')
      doc.setTextColor(255, 255, 255)
      doc.setFont('helvetica', 'bold')
      doc.setFontSize(22)
      doc.text('Question Bank', margin, 46)
      doc.setFontSize(11)
      doc.setFont('helvetica', 'normal')
      doc.text('Questions & Answers', margin, 66)
      doc.setFontSize(9)
      doc.text(`Generated ${new Date().toLocaleString()}  ·  ${qs.length} questions`, margin, 84)

      // filter summary
      const filters: string[] = []
      if (search) filters.push(`Search: "${search}"`)
      if (subjectFilter) {
        const s = (facets?.subjects ?? []).find((x) => String(x.id) === subjectFilter)
        if (s) filters.push(`Subject: ${s.name}`)
      }
      if (difficultyFilter !== 'all') filters.push(`Difficulty: ${difficultyFilter}`)
      if (filters.length > 0) {
        doc.text(`Filters: ${filters.join('  |  ')}`, margin, 108)
      }

      let y = filters.length > 0 ? 128 : 112
      doc.setTextColor(0, 0, 0)

      const ensureSpace = (needed: number) => {
        if (y + needed > pageHeight - 60) {
          doc.addPage()
          y = 40
        }
      }

      const drawFooter = () => {
        const pages = doc.getNumberOfPages()
        for (let p = 1; p <= pages; p++) {
          doc.setPage(p)
          doc.setFontSize(8)
          doc.setTextColor(150)
          doc.text(`Page ${p} of ${pages}`, pageWidth / 2, pageHeight - 24, { align: 'center' })
          doc.text('PGCIP — Question Bank', margin, pageHeight - 24)
          doc.setTextColor(0, 0, 0)
        }
      }

      qs.forEach((q, index) => {
        ensureSpace(60)

        // Question header bar
        doc.setFillColor(241, 245, 249)
        doc.rect(margin, y - 2, contentWidth, 22, 'F')
        doc.setFont('helvetica', 'bold')
        doc.setFontSize(11)
        doc.setTextColor(30, 41, 59)
        const qTitle = `${index + 1}. ${q.question}`
        const qLines = doc.splitTextToSize(qTitle, contentWidth - 12)
        doc.text(qLines, margin + 6, y + 12)
        y += qLines.length * 14 + 10

        // Metadata row
        doc.setFont('helvetica', 'normal')
        doc.setFontSize(8.5)
        doc.setTextColor(100, 116, 139)
        const meta = [q.category?.replace(/_/g, ' '), q.difficulty, q.subjectName, q.topicName].filter(Boolean).join('   ·   ')
        if (meta) {
          doc.text(meta, margin + 6, y)
          y += 14
        }
        doc.setTextColor(0, 0, 0)

        // Options (if any)
        if (q.options && q.options.length > 0) {
          doc.setFontSize(10)
          doc.setTextColor(51, 65, 85)
          for (const opt of q.options) {
            ensureSpace(13)
            const isCorrect = opt.key === q.correctOption
            const prefix = isCorrect ? '✓ ' : '   '
            const optLine = `${prefix}${opt.key}. ${opt.text}`
            const optLines = doc.splitTextToSize(optLine, contentWidth - 16)
            if (isCorrect) doc.setFont('helvetica', 'bold')
            else doc.setFont('helvetica', 'normal')
            doc.text(optLines, margin + 10, y)
            y += optLines.length * 13 + 2
          }
          doc.setFont('helvetica', 'normal')
          doc.setTextColor(0, 0, 0)
          y += 4
        }

        // Answer block
        if (q.answer) {
          ensureSpace(24)
          doc.setFillColor(238, 242, 255)
          doc.rect(margin, y, contentWidth, 16, 'F')
          doc.setFont('helvetica', 'bold')
          doc.setFontSize(9.5)
          doc.setTextColor(67, 56, 202)
          doc.text('ANSWER', margin + 8, y + 11)
          doc.setTextColor(0, 0, 0)
          y += 22

          doc.setFont('helvetica', 'normal')
          doc.setFontSize(10.5)
          doc.setTextColor(30, 41, 59)
          const aLines = doc.splitTextToSize(q.answer, contentWidth - 12)
          for (const line of aLines) {
            ensureSpace(14)
            doc.text(line, margin + 6, y)
            y += 14
          }
          y += 6
        } else {
          ensureSpace(16)
          doc.setFont('helvetica', 'italic')
          doc.setFontSize(10)
          doc.setTextColor(148, 163, 184)
          doc.text('No answer yet.', margin + 6, y)
          doc.setTextColor(0, 0, 0)
          y += 16
        }

        // Why asked
        if (q.whyAsked) {
          ensureSpace(14)
          doc.setFont('helvetica', 'italic')
          doc.setFontSize(9)
          doc.setTextColor(100, 116, 139)
          const wLines = doc.splitTextToSize(`Why asked: ${q.whyAsked}`, contentWidth - 12)
          for (const line of wLines) {
            ensureSpace(12)
            doc.text(line, margin + 6, y)
            y += 12
          }
          doc.setTextColor(0, 0, 0)
          y += 4
        }

        y += 8
        if (y < pageHeight - 60) {
          doc.setDrawColor(226, 232, 240)
          doc.line(margin, y, pageWidth - margin, y)
          y += 12
        }
      })

      drawFooter()
      doc.save('question-bank.pdf')
      setNoticeType('success')
      setNotice(`Downloaded ${qs.length} questions as PDF.`)
    } catch (error) {
      setNoticeType('error')
      setNotice(error instanceof Error ? error.message : 'Could not generate the PDF.')
    } finally {
      setDownloadingPdf(false)
    }
  }

  const groups = useMemo(() => buildGroups(questions, groupBy), [questions, groupBy])

  const activeFilterCount =
    (sourceFilter !== 'all' ? 1 : 0) +
    (categoryFilter ? 1 : 0) +
    (subjectFilter ? 1 : 0) +
    (topicFilter ? 1 : 0) +
    (companyFilter ? 1 : 0) +
    (difficultyFilter !== 'all' ? 1 : 0) +
    (typeFilter !== 'all' ? 1 : 0)

  const clearFilters = () => {
    setSourceFilter('all')
    setCategoryFilter('')
    setSubjectFilter('')
    setTopicFilter('')
    setCompanyFilter('')
    setDifficultyFilter('all')
    setTypeFilter('all')
    setPage(1)
  }

  return (
    <div className="space-y-4 sm:space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <h1 className="text-xl font-bold text-slate-800 sm:text-2xl">Question Bank</h1>
          <p className="mt-0.5 text-xs text-slate-500 sm:text-sm">
            {totalPracticed} / {pagination.total} practiced
            {jdId ? ' (filtered by JD)' : ''} · Interview guides, your questions and Mock Exam questions in one place
          </p>
        </div>
        <div className="flex flex-col gap-2 sm:flex-row">
          <Button variant="secondary" onClick={() => setShowCategoryModal(true)} className="w-full sm:w-auto">⚙ Categories</Button>
          <Button variant="secondary" onClick={handleDownloadPdf} disabled={downloadingPdf} className="w-full sm:w-auto">
            {downloadingPdf ? '⏳ Generating…' : '⬇ Download PDF'}
          </Button>
          <Button onClick={() => setShowAddModal(true)} className="w-full sm:w-auto">+ Add Question</Button>
        </div>
      </div>

      {/* Search, answer size and grouping */}
      <div className="flex flex-col gap-3 rounded-xl border border-slate-200 bg-white p-3 sm:flex-row sm:flex-wrap sm:items-center">
        <form
          onSubmit={(event) => { event.preventDefault(); setPage(1); setSearch(searchInput.trim()) }}
          className="flex w-full items-center gap-2 sm:min-w-[240px] sm:flex-1"
        >
          <input
            value={searchInput}
            onChange={(event) => setSearchInput(event.target.value)}
            placeholder="Search questions and answers…"
            className="w-full min-w-0 rounded-lg border border-slate-300 px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
          <Button size="sm" type="submit" className="flex-shrink-0">🔎 Search</Button>
          {search ? (
            <button
              type="button"
              onClick={() => { setSearchInput(''); setSearch(''); setPage(1) }}
              className="text-xs text-slate-500 underline"
            >
              Clear
            </button>
          ) : null}
        </form>
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs font-medium text-slate-500">Answer size</span>
          <div className="flex max-w-full gap-1 overflow-x-auto rounded-lg bg-slate-100 p-1">
            {(['sm', 'md', 'lg'] as const).map((size) => (
              <button
                key={size}
                type="button"
                onClick={() => setAnswerFontSize(size)}
                className={`whitespace-nowrap rounded-md px-2 py-1 text-xs font-medium transition ${answerFontSize === size ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500'}`}
              >
                {size === 'sm' ? 'Small' : size === 'md' ? 'Medium' : 'Large'}
              </button>
            ))}
          </div>
          <span className="text-xs font-medium text-slate-500 sm:ml-2">Difficulty</span>
          <div className="flex max-w-full gap-1 overflow-x-auto rounded-lg bg-slate-100 p-1">
            {([['all', 'All'], ['HARD', 'Hard'], ['MEDIUM', 'Medium'], ['EASY', 'Easy']] as const).map(([value, label]) => (
              <button
                key={value}
                type="button"
                onClick={() => { setDifficultyFilter(value); setPage(1) }}
                className={`whitespace-nowrap rounded-md px-2 py-1 text-xs font-medium transition ${difficultyFilter === value ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500'}`}
              >
                {label}
              </button>
            ))}
          </div>
          <span className="text-xs font-medium text-slate-500 sm:ml-2">Sort by</span>
          <div className="flex max-w-full gap-1 overflow-x-auto rounded-lg bg-slate-100 p-1">
            {([['default', 'Newest'], ['hard-first', 'Hard first'], ['easy-first', 'Easy first'], ['az', 'A–Z']] as const).map(([value, label]) => (
              <button
                key={value}
                type="button"
                onClick={() => { setSortBy(value); setPage(1) }}
                className={`whitespace-nowrap rounded-md px-2 py-1 text-xs font-medium transition ${sortBy === value ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500'}`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        {/* Subject & Topic filters */}
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <label className="flex flex-1 items-center gap-2">
            <span className="whitespace-nowrap text-xs font-medium text-slate-500">Subject</span>
            <select
              value={subjectFilter}
              onChange={(event) => { setSubjectFilter(event.target.value); setTopicFilter(''); setPage(1) }}
              className="w-full rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="">All subjects</option>
              {(facets?.subjects ?? []).map((facet) => (
                <option key={facet.id} value={String(facet.id)}>{facet.name} ({facet.count})</option>
              ))}
            </select>
          </label>
          <label className="flex flex-1 items-center gap-2">
            <span className="whitespace-nowrap text-xs font-medium text-slate-500">Topic</span>
            <select
              value={topicFilter}
              onChange={(event) => { setTopicFilter(event.target.value); setPage(1) }}
              disabled={!subjectFilter}
              className="w-full rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:bg-slate-50 disabled:text-slate-400"
            >
              <option value="">{subjectFilter ? 'All topics' : 'Select a subject first'}</option>
              {(facets?.topics ?? [])
                .filter((t) => !subjectFilter || String(t.subjectId) === subjectFilter)
                .map((t) => (
                  <option key={t.id} value={String(t.id)}>{t.name} ({t.count})</option>
                ))}
            </select>
          </label>
          {activeFilterCount > 0 ? (
            <button type="button" onClick={clearFilters} className="whitespace-nowrap text-xs font-medium text-indigo-600 underline">
              Clear filters
            </button>
          ) : null}
        </div>
      </div>

      {notice ? (
        <div className={`flex items-center justify-between gap-3 rounded-lg border px-4 py-3 text-sm ${
          noticeType === 'success'
            ? 'border-green-200 bg-green-50 text-green-800'
            : 'border-amber-200 bg-amber-50 text-amber-800'
        }`}>
          <span>{notice}</span>
          <button type="button" onClick={() => setNotice('')} className="flex-shrink-0 text-lg leading-none opacity-60 hover:opacity-100" aria-label="Dismiss message">×</button>
        </div>
      ) : null}

      {/* Results */}
      <div className="min-w-0 space-y-3">
          <div className="flex flex-wrap items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2">
            <span className="text-xs font-semibold text-slate-600">View:</span>
            <span className="text-xs text-slate-500">
              {groupBy === 'none'
                ? `${pagination.total} questions`
                : `${groups.length} ${groupBy} group${groups.length !== 1 ? 's' : ''} · ${pagination.total} questions`}
            </span>
            <span className="ml-auto hidden text-[11px] text-slate-400 sm:inline">Click a question to read its answer</span>
          {isSuperAdmin && selectedQuestionsList.length > 0 ? (
            <Button size="sm" variant="danger" onClick={() => void bulkDeleteSelected()} loading={bulkDeleteBusy}>
              Delete selected ({selectedQuestionsList.length})
            </Button>
          ) : null}
          </div>

      {isLoading ? (
        <div className="space-y-3">{Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} height="80px" />)}</div>
      ) : questions.length === 0 ? (
        <div className="text-center py-10 rounded-xl border border-dashed border-slate-300 bg-slate-50 sm:py-16">
          <span className="text-5xl mb-4 block">❓</span>
          <h3 className="text-lg font-semibold text-slate-700 mb-1">No questions found</h3>
          <p className="text-sm text-slate-500 mb-4">Try another search, source, subject or topic. You can also add your own interview questions.</p>
          <Button onClick={() => setShowAddModal(true)}>+ Add Question</Button>
        </div>
      ) : groupBy === 'none' ? (
        <div className="space-y-3">
          {questions.map((q) => (
            <QuestionItem
              key={q.id}
              question={q}
              onTogglePracticed={handleTogglePracticed}
              onDelete={handleDelete}
              onEdit={handleOpenEdit}
              onRegenerate={handleRegenerate}
              onSaveAnswer={handleSaveAnswer}
              selectable
              selected={Boolean(selectedQuestions[q.id])}
              onToggleSelect={(id, checked) => setSelectedQuestions((prev) => ({ ...prev, [id]: checked }))}
              regenerating={regeneratingId === q.id}
              answerFontSize={answerFontSize}
            />
          ))}

          <div className="flex flex-col gap-3 rounded-lg border border-slate-200 bg-white px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
            <span className="text-xs text-slate-500">
              Page {pagination.page} of {pagination.totalPages} · {pagination.total} questions
            </span>
            <div className="flex gap-2">
              <Button size="sm" variant="secondary" disabled={page <= 1} onClick={() => setPage((value) => Math.max(1, value - 1))} className="flex-1 sm:flex-none">
                Previous
              </Button>
              <Button size="sm" variant="secondary" disabled={page >= pagination.totalPages} onClick={() => setPage((value) => value + 1)} className="flex-1 sm:flex-none">
                Next
              </Button>
            </div>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          {groups.map((group) => {
            const collapsed = collapsedGroups[group.key] === true
            return (
              <section key={group.key} className="overflow-hidden rounded-xl border border-slate-200 bg-white">
                <button
                  type="button"
                  onClick={() => setCollapsedGroups((prev) => ({ ...prev, [group.key]: !collapsed }))}
                  className="flex w-full items-center justify-between bg-slate-50 px-4 py-3 text-left transition hover:bg-slate-100"
                >
                  <span className="flex min-w-0 items-center gap-2">
                    <span className="text-xs text-slate-400">{collapsed ? '▶' : '▼'}</span>
                    <span className="truncate text-sm font-semibold text-slate-800">{group.label}</span>
                  </span>
                  <span className="ml-2 flex-shrink-0 rounded-full bg-indigo-50 px-2 py-0.5 text-xs font-medium text-indigo-700">{group.count}</span>
                </button>
                {collapsed ? null : (
                  <div className="space-y-3 p-3">
                    {group.questions.map((q) => (
                      <QuestionItem
                        key={q.id}
                        question={q}
                        onTogglePracticed={handleTogglePracticed}
                        onDelete={handleDelete}
                        onEdit={handleOpenEdit}
                        onRegenerate={handleRegenerate}
                        onSaveAnswer={handleSaveAnswer}
                        selectable
                        selected={Boolean(selectedQuestions[q.id])}
                        onToggleSelect={(id, checked) => setSelectedQuestions((prev) => ({ ...prev, [id]: checked }))}
                        regenerating={regeneratingId === q.id}
                        answerFontSize={answerFontSize}
                      />
                    ))}
                  </div>
                )}
              </section>
            )
          })}
        </div>
      )}
      </div>

      {showAddModal && (
        <Modal isOpen onClose={() => setShowAddModal(false)} title="Add Question">
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Question *</label>
              <textarea
                value={qText}
                onChange={(e) => setQText(e.target.value)}
                rows={3}
                placeholder="Enter the interview question…"
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Subject</label>
                <select value={qSubjectId} onChange={(e) => { setQSubjectId(e.target.value); setQTopicId(''); }} className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500">
                  <option value="">General</option>
                  {(facets?.subjects ?? []).map((s) => (
                    <option key={s.id} value={String(s.id)}>{s.name} ({s.count})</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Topic</label>
                <select value={qTopicId} onChange={(e) => setQTopicId(e.target.value)} disabled={!qSubjectId} className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:bg-slate-50 disabled:text-slate-400">
                  <option value="">General</option>
                  {(facets?.topics ?? [])
                    .filter((t) => !qSubjectId || String(t.subjectId) === qSubjectId)
                    .map((t) => (
                      <option key={t.id} value={String(t.id)}>{t.name} ({t.count})</option>
                    ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Difficulty</label>
                <select value={qDifficulty} onChange={(e) => setQDifficulty(e.target.value)} className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500">
                  {['EASY', 'MEDIUM', 'HARD'].map((d) => <option key={d} value={d}>{d}</option>)}
                </select>
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Company (optional)</label>
              <select value={qCompanyId} onChange={(e) => setQCompanyId(e.target.value)} className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500">
                <option value="">— Select company —</option>
                {companies.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">My Answer (optional)</label>
              <textarea
                value={qAnswer}
                onChange={(e) => setQAnswer(e.target.value)}
                rows={3}
                placeholder="Write your answer or notes…"
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
            <div className="flex gap-2">
              <Button variant="secondary" onClick={() => setShowAddModal(false)} className="flex-1">Cancel</Button>
              <Button onClick={handleAddQuestion} disabled={saving || !qText.trim()} className="flex-1">
                {saving ? 'Saving…' : 'Add Question'}
              </Button>
            </div>
          </div>
        </Modal>
      )}

      {showCategoryModal && (
        <Modal isOpen onClose={() => setShowCategoryModal(false)} title="Manage Categories">
          <div className="space-y-4">
            {/* Existing categories */}
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {categories.length === 0 ? (
                <p className="text-sm text-slate-500 text-center py-4">No categories yet.</p>
              ) : categories.map((cat) => (
                <div key={cat.id} className="flex items-center justify-between rounded-lg border border-slate-200 px-3 py-2">
                  <div className="flex items-center gap-2">
                    <span className={`inline-block w-2.5 h-2.5 rounded-full ${
                      cat.color === 'blue' ? 'bg-blue-500' :
                      cat.color === 'amber' ? 'bg-amber-500' :
                      cat.color === 'green' ? 'bg-green-500' :
                      cat.color === 'red' ? 'bg-red-500' : 'bg-slate-400'
                    }`} />
                    <span className="text-sm font-medium text-slate-700">{cat.name.replace(/_/g, ' ')}</span>
                  </div>
                  <button
                    onClick={() => handleDeleteCategory(cat.id)}
                    className="text-slate-300 hover:text-red-500 text-sm"
                    aria-label="Delete category"
                  >🗑️</button>
                </div>
              ))}
            </div>

            {/* Add new category */}
            <div className="border-t border-slate-200 pt-4">
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">Add New Category</p>
              <div className="flex flex-col gap-2 sm:flex-row">
                <input
                  type="text"
                  value={newCatName}
                  onChange={(e) => setNewCatName(e.target.value)}
                  placeholder="e.g. DSA or Cloud"
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 sm:flex-1"
                  onKeyDown={(e) => { if (e.key === 'Enter') void handleAddCategory() }}
                />
                <select
                  value={newCatColor}
                  onChange={(e) => setNewCatColor(e.target.value)}
                  className="rounded-lg border border-slate-300 px-2 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="blue">🔵 Blue</option>
                  <option value="green">🟢 Green</option>
                  <option value="amber">🟡 Amber</option>
                  <option value="red">🔴 Red</option>
                  <option value="slate">⚪ Slate</option>
                </select>
                <Button onClick={handleAddCategory} disabled={catSaving || !newCatName.trim()} className="w-full sm:w-auto">
                  {catSaving ? '…' : 'Add'}
                </Button>
              </div>
            </div>

            <Button variant="secondary" onClick={() => setShowCategoryModal(false)} className="w-full">
              Done
            </Button>
          </div>
        </Modal>
      )}

      {editingQuestion && (
        <Modal isOpen onClose={() => setEditingQuestion(null)} title="Edit Question">
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Question *</label>
              <textarea
                value={qText}
                onChange={(e) => setQText(e.target.value)}
                rows={3}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Category</label>
                <select value={qCategory} onChange={(e) => setQCategory(e.target.value)} className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500">
                  {categories.map((c) => (
                    <option key={c.id} value={c.name}>{c.name.replace(/_/g, ' ')}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Difficulty</label>
                <select value={qDifficulty} onChange={(e) => setQDifficulty(e.target.value)} className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500">
                  {['EASY', 'MEDIUM', 'HARD'].map((d) => <option key={d} value={d}>{d}</option>)}
                </select>
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Company (optional)</label>
              <select value={qCompanyId} onChange={(e) => setQCompanyId(e.target.value)} className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500">
                <option value="">— None —</option>
                {companies.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Why Asked (optional)</label>
              <textarea
                value={qWhyAsked}
                onChange={(e) => setQWhyAsked(e.target.value)}
                rows={2}
                placeholder="Why is this question typically asked?"
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Answer (optional)</label>
              <textarea
                value={qAnswer}
                onChange={(e) => setQAnswer(e.target.value)}
                rows={5}
                placeholder="Write your answer or notes…"
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
            <div className="flex gap-2">
              <Button variant="secondary" onClick={() => setEditingQuestion(null)} className="flex-1">Cancel</Button>
              <Button onClick={handleSaveEdit} disabled={saving || !qText.trim()} className="flex-1">
                {saving ? 'Saving…' : 'Save Changes'}
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  )
}

export default function QuestionsPage() {
  return (
    <Suspense fallback={<div className="space-y-4"><Skeleton height="400px" /></div>}>
      <QuestionsContent />
    </Suspense>
  )
}
