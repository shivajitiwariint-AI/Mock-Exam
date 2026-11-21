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

type GroupBy = 'none' | 'subject' | 'topic' | 'company' | 'category'
type SortBy = 'default' | 'hard-first' | 'easy-first' | 'az'

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

  const [questions, setQuestions] = useState<InterviewQuestionData[]>([])
  const [companies, setCompanies] = useState<CompanyData[]>([])
  const [categories, setCategories] = useState<InterviewCategoryData[]>([])
  const [pagination, setPagination] = useState({ page: 1, pageSize: 20, total: 0, totalPages: 1 })
  const [totalPracticed, setTotalPracticed] = useState(0)
  const [isLoading, setIsLoading] = useState(true)
  const [showAddModal, setShowAddModal] = useState(false)
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
  const [regeneratingId, setRegeneratingId] = useState<number | null>(null)
  const [notice, setNotice] = useState('')
  const [noticeType, setNoticeType] = useState<'success' | 'error'>('error')
  const [facets, setFacets] = useState<InterviewQuestionFacets | null>(null)
  const [groupBy, setGroupBy] = useState<GroupBy>('subject')
  const [collapsedGroups, setCollapsedGroups] = useState<Record<string, boolean>>({})
  const [showMobileFilters, setShowMobileFilters] = useState(false)

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
  }, [jdId, practicedFilter, typeFilter, companyFilter, sourceFilter, categoryFilter, subjectFilter, topicFilter, page, search, sortBy, groupBy])

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
    if (id < 0) return
    if (!confirm('Delete this question? This cannot be undone.')) return
    try {
      const res = await fetch(`/api/interview/questions/${id}`, { method: 'DELETE' })
      if (!res.ok) throw new Error('The question could not be deleted.')
      setQuestions((prev) => prev.filter((q) => q.id !== id))
      setNoticeType('success')
      setNotice('Question deleted.')
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
      category: qCategory,
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

  const groups = useMemo(() => buildGroups(questions, groupBy), [questions, groupBy])

  const globalTotal = (facets?.sources ?? []).reduce((sum, source) => sum + source.count, 0)

  const sourceCounts = {
    all: globalTotal,
    interview: (facets?.sources ?? [])
      .filter((source) => ['MANUAL', 'AI_JD', 'EXPERIENCE'].includes(source.value))
      .reduce((sum, source) => sum + source.count, 0),
    guide: facets?.sources.find((source) => source.value === 'AI_GUIDE')?.count ?? 0,
    mock: facets?.sources.find((source) => source.value === 'MOCK_EXAM')?.count ?? 0,
  }

  const activeFilterCount =
    (sourceFilter !== 'all' ? 1 : 0) +
    (categoryFilter ? 1 : 0) +
    (subjectFilter ? 1 : 0) +
    (topicFilter ? 1 : 0) +
    (companyFilter ? 1 : 0) +
    (typeFilter !== 'all' ? 1 : 0)

  const clearFilters = () => {
    setSourceFilter('all')
    setCategoryFilter('')
    setSubjectFilter('')
    setTopicFilter('')
    setCompanyFilter('')
    setTypeFilter('all')
    setPage(1)
  }

  const filterRow = (active: boolean, label: string, count: number, onClick: () => void) => (
    <button
      type="button"
      onClick={onClick}
      className={`flex w-full items-center justify-between gap-2 rounded-md px-2 py-1.5 text-left text-xs transition-colors ${
        active ? 'bg-indigo-50 font-semibold text-indigo-700' : 'text-slate-600 hover:bg-slate-50'
      }`}
    >
      <span className="truncate" title={label}>{label}</span>
      <span className={`ml-auto flex-shrink-0 rounded-full px-1.5 py-0.5 text-[10px] ${active ? 'bg-indigo-100 text-indigo-700' : 'bg-slate-100 text-slate-500'}`}>
        {count}
      </span>
    </button>
  )

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
          <span className="text-xs font-medium text-slate-500 sm:ml-2">Group by</span>
          <div className="flex max-w-full gap-1 overflow-x-auto rounded-lg bg-slate-100 p-1">
            {([['none', 'None'], ['subject', 'Subject'], ['topic', 'Topic'], ['company', 'Company'], ['category', 'Category']] as const).map(([value, label]) => (
              <button
                key={value}
                type="button"
                onClick={() => { setGroupBy(value); setCollapsedGroups({}) }}
                className={`whitespace-nowrap rounded-md px-2 py-1 text-xs font-medium transition ${groupBy === value ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500'}`}
              >
                {label}
              </button>
            ))}
          </div>
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

      {/* Left filter panel + grouped results */}
      <div className="mb-2 flex items-center justify-between gap-2 lg:hidden">
        <button
          type="button"
          onClick={() => setShowMobileFilters((value) => !value)}
          className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700"
        >
          🔎 Filters{activeFilterCount > 0 ? ` (${activeFilterCount})` : ''}
          <span className="text-xs text-slate-400">{showMobileFilters ? '▲' : '▼'}</span>
        </button>
        {activeFilterCount > 0 ? (
          <button type="button" onClick={clearFilters} className="text-xs font-medium text-indigo-600 underline">
            Clear all
          </button>
        ) : null}
      </div>

      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:gap-6">
        <aside className={`${showMobileFilters ? 'block' : 'hidden'} w-full flex-shrink-0 space-y-4 rounded-xl border border-slate-200 bg-white p-3 lg:sticky lg:top-4 lg:block lg:w-64`}>
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-slate-800">🔎 Filters</h2>
            {activeFilterCount > 0 ? (
              <button type="button" onClick={clearFilters} className="text-[11px] font-medium text-indigo-600 underline">
                Clear all ({activeFilterCount})
              </button>
            ) : null}
          </div>

          <section>
            <h3 className="mb-1 px-2 text-[11px] font-semibold uppercase tracking-wide text-slate-400">Source</h3>
            {filterRow(sourceFilter === 'all', 'All questions', sourceCounts.all, () => { setSourceFilter('all'); setPage(1) })}
            {filterRow(sourceFilter === 'interview', 'My interview questions', sourceCounts.interview, () => { setSourceFilter('interview'); setPage(1) })}
            {filterRow(sourceFilter === 'guide', 'Interview guides', sourceCounts.guide, () => { setSourceFilter('guide'); setPage(1) })}
            {filterRow(sourceFilter === 'mock', 'Mock Exam', sourceCounts.mock, () => { setSourceFilter('mock'); setPage(1) })}
          </section>

          <section>
            <h3 className="mb-1 px-2 text-[11px] font-semibold uppercase tracking-wide text-slate-400">Category</h3>
            {filterRow(!categoryFilter, 'All categories', globalTotal, () => { setCategoryFilter(''); setPage(1) })}
            {(facets?.categories ?? []).map((facet) => filterRow(
              categoryFilter === facet.name,
              facet.name.replace(/_/g, ' '),
              facet.count,
              () => { setCategoryFilter(categoryFilter === facet.name ? '' : facet.name); setPage(1) },
            ))}
          </section>

          <section>
            <h3 className="mb-1 px-2 text-[11px] font-semibold uppercase tracking-wide text-slate-400">Subject</h3>
            {filterRow(!subjectFilter, 'All subjects', globalTotal, () => { setSubjectFilter(''); setTopicFilter(''); setPage(1) })}
            {(facets?.subjects ?? []).map((facet) => filterRow(
              subjectFilter === String(facet.id),
              facet.name,
              facet.count,
              () => { setSubjectFilter(subjectFilter === String(facet.id) ? '' : String(facet.id)); setTopicFilter(''); setPage(1) },
            ))}
          </section>

          <section>
            <h3 className="mb-1 px-2 text-[11px] font-semibold uppercase tracking-wide text-slate-400">Company</h3>
            {filterRow(companyFilter === '' && typeFilter === 'all', 'All companies', globalTotal, () => { setCompanyFilter(''); setTypeFilter('all'); setPage(1) })}
            {filterRow(typeFilter === 'general', '🌐 General (no company)', sourceCounts.interview, () => { setCompanyFilter(''); setTypeFilter('general'); setPage(1) })}
            {(facets?.companies ?? []).map((facet) => filterRow(
              companyFilter === String(facet.id),
              facet.name,
              facet.count,
              () => { setCompanyFilter(companyFilter === String(facet.id) ? '' : String(facet.id)); setTypeFilter('company'); setPage(1) },
            ))}
          </section>
        </aside>

        <div className="min-w-0 flex-1 space-y-3">
          <div className="flex flex-wrap items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2">
            <span className="text-xs font-semibold text-slate-600">View:</span>
            <span className="text-xs text-slate-500">
              {groupBy === 'none'
                ? `${pagination.total} questions`
                : `${groups.length} ${groupBy} group${groups.length !== 1 ? 's' : ''} · ${pagination.total} questions`}
            </span>
            <span className="ml-auto hidden text-[11px] text-slate-400 sm:inline">Click a question to read its answer</span>
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
