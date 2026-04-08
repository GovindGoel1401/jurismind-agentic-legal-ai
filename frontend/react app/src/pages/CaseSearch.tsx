import { useEffect, useMemo, useState } from 'react'
import { Search } from 'lucide-react'
import { Link, useParams } from 'react-router-dom'
import CaseGapAnalysisPanel from '../components/similar-cases/CaseGapAnalysisPanel'
import PatternInsightsPanel from '../components/similar-cases/PatternInsightsPanel'
import SimilarCaseComparisonPanel from '../components/similar-cases/SimilarCaseComparisonPanel'
import SimilarCaseList from '../components/similar-cases/SimilarCaseList'
import EmptyState from '../components/shared/EmptyState'
import InfoCard from '../components/shared/InfoCard'
import PageHeader from '../components/shared/PageHeader'
import CaseWorkflowStepper from '../components/shared/CaseWorkflowStepper'
import ErrorMessage from '../components/ErrorMessage'
import { Label } from '../components/ui/Label'
import { Select } from '../components/ui/Select'
import { useAnalysisWorkspace } from '../hooks/useAnalysisWorkspace'
import { useCaseStageRedirect } from '../hooks/useCaseStageRedirect'
import caseService, { SimilarCaseIntelligenceResponse, SimilarCaseResult } from '../services/caseService'
import { getApiErrorMessage } from '../services/api'

export default function CaseSearch() {
  const { caseId: routeCaseId } = useParams()
  const caseId = useCaseStageRedirect('/similar-cases', routeCaseId)
  const {
    caseContext,
    workflowState,
    hasStoredCase,
    latestAnalysis,
    loading: workspaceLoading,
    error: workspaceError,
  } = useAnalysisWorkspace(caseId)
  const [query, setQuery] = useState('')
  const [courtFilter, setCourtFilter] = useState('All Courts')
  const [minSimilarity, setMinSimilarity] = useState(0)
  const [results, setResults] = useState<SimilarCaseResult[]>([])
  const [insights, setInsights] = useState<SimilarCaseIntelligenceResponse | null>(null)
  const [selectedCaseId, setSelectedCaseId] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')

  useEffect(() => {
    const suggestedQuery = caseContext.description || ''
    if (!suggestedQuery) return
    setQuery(suggestedQuery)
  }, [caseContext.description])

  useEffect(() => {
    const storedResult = ((workflowState as { similar_cases?: { result?: SimilarCaseIntelligenceResponse } } | null)
      ?.similar_cases?.result || null) as SimilarCaseIntelligenceResponse | null
    if (!storedResult?.similar_cases?.length) return
    setInsights(storedResult)
    setResults(storedResult.similar_cases)
    setSelectedCaseId((current) => current || storedResult.similar_cases[0]?.case_id || null)
  }, [workflowState])

  const filtered = useMemo(() => {
    return results.filter((item) => {
      const matchesCourt = courtFilter === 'All Courts' || item.court === courtFilter
      const matchesSimilarity = Math.round(Number(item.similarity_score || 0) * 100) >= minSimilarity
      return matchesCourt && matchesSimilarity
    })
  }, [results, courtFilter, minSimilarity])

  const courtOptions = useMemo(
    () => ['All Courts', ...Array.from(new Set(results.map((item) => item.court).filter(Boolean)))],
    [results],
  )

  const selectedCase = useMemo(
    () => filtered.find((item) => item.case_id === selectedCaseId) || filtered[0] || null,
    [filtered, selectedCaseId],
  )

  const runSearch = async () => {
    const trimmedQuery = query.trim()
    if (trimmedQuery.length < 10) {
      setMessage('Enter at least 10 characters to search similar cases.')
      setError('')
      setResults([])
      return
    }

    setLoading(true)
    setMessage('')
    setError('')
    try {
      const response = caseId
        ? await caseService.searchCaseSimilarCases(caseId, {
            query: trimmedQuery,
            topK: 8,
          })
        : await caseService.findSimilarCases({
            query: trimmedQuery,
            topK: 8,
            category: caseContext.category,
            jurisdiction: caseContext.jurisdiction,
            document_intelligence: ((latestAnalysis?.documentIntelligence || {}) as Record<string, unknown>),
            case_assessment: ((latestAnalysis?.caseAssessment || {}) as Record<string, unknown>),
          })

      const payload = response || null
      const items = payload?.similar_cases || []
      setInsights(payload)
      setResults(items)
      setSelectedCaseId(items[0]?.case_id || null)
      setMessage(items.length ? '' : 'No similar cases were found for this query.')
    } catch (caughtError) {
      setResults([])
      setInsights(null)
      setSelectedCaseId(null)
      setError(getApiErrorMessage(caughtError, 'Similar case retrieval is unavailable right now.'))
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="page-shell space-y-6">
      <PageHeader
        eyebrow="Research"
        title="Similar Cases"
        description="Search retrieved precedents and related cases from the backend similarity pipeline."
      />

      <CaseWorkflowStepper />

      {workspaceLoading ? (
        <section className="panel">
          <p className="text-sm text-legal-muted">Loading case workspace...</p>
        </section>
      ) : null}
      {workspaceError ? <ErrorMessage title="Case Workspace" message={workspaceError} /> : null}

      {!hasStoredCase ? (
        <EmptyState
          title="No saved case context yet"
          description="You can still search manually, but JurisMind works best when a case has been submitted first so the search can start from your dispute facts."
          actionLabel="Create Case Input"
          actionHref="/case-input"
        />
      ) : null}

      <section className="panel">
        <div className="mb-4 grid gap-3 md:grid-cols-3">
          <InfoCard label="Current Case Category" value={caseContext.category} />
          <InfoCard label="Current Jurisdiction" value={caseContext.jurisdiction} />
          <InfoCard label="Stored Analysis Context" value={latestAnalysis ? 'Available' : 'Limited'} />
        </div>

        <div className="mt-5 flex items-center gap-3 rounded-md border border-slate-700 bg-legal-card px-3">
          <Search size={16} className="text-legal-gold" />
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === 'Enter') {
                event.preventDefault()
                void runSearch()
              }
            }}
            placeholder="Search cases, laws, precedents."
            className="h-11 w-full bg-transparent text-sm text-legal-text outline-none placeholder:text-legal-muted"
          />
          <button type="button" onClick={runSearch} disabled={loading} className="btn-legal whitespace-nowrap">
            {loading ? 'Searching...' : 'Search'}
          </button>
        </div>

        <div className="mt-4 grid gap-4 md:grid-cols-2">
          <div>
            <Label className="mb-2 block" htmlFor="court-filter">
              Court
            </Label>
            <Select
              id="court-filter"
              value={courtFilter}
              onChange={(event) => setCourtFilter(event.target.value)}
              options={courtOptions.map((court) => ({ label: String(court), value: String(court) }))}
            />
          </div>

          <label className="text-sm text-legal-muted">
            Minimum Similarity: {minSimilarity}%
            <input
              type="range"
              min={0}
              max={100}
              value={minSimilarity}
              onChange={(event) => setMinSimilarity(Number(event.target.value))}
              className="mt-3 w-full accent-amber-500"
            />
          </label>
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-3 text-xs">
          <span className="rounded-full border border-slate-700 px-2 py-1 text-legal-muted">
            Results: {filtered.length}
          </span>
          <button
            type="button"
            onClick={() => {
              setCourtFilter('All Courts')
              setMinSimilarity(0)
            }}
            className="rounded-full border border-legal-gold/40 px-2 py-1 text-legal-gold hover:bg-legal-gold/10"
          >
            Reset filters
          </button>
        </div>

        {message ? (
          <div className="mt-4 rounded-md border border-slate-700 bg-legal-card px-4 py-3 text-sm text-legal-muted">
            {message}
          </div>
        ) : null}
        {error ? (
          <div className="mt-4">
            <ErrorMessage message={error} onRetry={() => void runSearch()} />
          </div>
        ) : null}
      </section>

      {filtered.length > 0 ? (
        <>
          <SimilarCaseList
            cases={filtered}
            selectedCaseId={selectedCase?.case_id || null}
            onSelect={(item) => setSelectedCaseId(item.case_id)}
          />

          <SimilarCaseComparisonPanel selectedCase={selectedCase} caseContext={caseContext} />

          <CaseGapAnalysisPanel items={insights?.case_gap_analysis || []} />

          <PatternInsightsPanel insights={insights?.pattern_insights || null} />
        </>
      ) : null}

      {!loading && !message && !error && filtered.length === 0 ? (
        <EmptyState
          title="Similar-case intelligence will appear here"
          description="Run a similar-case search to compare your case against retrieved precedents, gap signals, and outcome patterns."
        />
      ) : null}

      {latestAnalysis?.caseMeta?.case_id ? (
        <section className="panel">
          <div className="flex flex-wrap gap-3">
            <Link to={`/analysis/${latestAnalysis.caseMeta.case_id}`} className="rounded-xl border border-white/15 px-4 py-2 text-sm font-semibold text-legal-text">
              Back To Analysis
            </Link>
            <Link to={`/knowledge-graph/${latestAnalysis.caseMeta.case_id}`} className="rounded-xl border border-white/15 px-4 py-2 text-sm font-semibold text-legal-text">
              Open Knowledge Graph
            </Link>
            <Link to={`/verdict/${latestAnalysis.caseMeta.case_id}`} className="btn-legal">
              Continue To Verdict
            </Link>
          </div>
        </section>
      ) : null}
    </div>
  )
}
