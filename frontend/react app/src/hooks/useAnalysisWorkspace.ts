import { useEffect, useMemo, useState } from 'react'
import caseService from '../services/caseService'
import type {
  CaseDetailResponse,
  CaseHistoryItem,
  DocumentIntelligencePayload,
} from '../services/caseService'
import { getApiErrorMessage } from '../services/api'
import { buildStoredDocumentPreview } from '../features/caseInput/documentIntelligence'
import {
  getRecentCases,
  saveRecentCases,
} from '../utils/analysisSession'
import { AnalysisResponseData, StoredCaseContext } from '../types/analysis'
import { useActiveCase } from '../context/ActiveCaseContext'

const defaultCaseContext: StoredCaseContext = {
  category: 'general-dispute',
  description: 'No case description provided yet.',
  jurisdiction: 'Unspecified jurisdiction',
  fileCount: 0,
}

function hasObjectContent(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value) && Object.keys(value as Record<string, unknown>).length > 0
}

function toStoredCaseContext(payload: Partial<StoredCaseContext> | null): StoredCaseContext {
  if (!payload) {
    return defaultCaseContext
  }

  return {
    caseId: payload.caseId,
    category: payload.category ?? defaultCaseContext.category,
    description: payload.description ?? defaultCaseContext.description,
    jurisdiction: payload.jurisdiction ?? defaultCaseContext.jurisdiction,
    fileCount: payload.fileCount ?? defaultCaseContext.fileCount,
    documentationPreview: payload.documentationPreview,
  }
}

function toDocumentationPreview(payload: Record<string, unknown> | null, fallback?: StoredCaseContext['documentationPreview']) {
  if (!hasObjectContent(payload)) {
    return fallback
  }

  const preview = buildStoredDocumentPreview(payload as unknown as DocumentIntelligencePayload)
  return {
    completenessScore: preview.completenessScore,
    readinessStatus: preview.readinessStatus,
    availableCount: preview.availableDocuments.length,
    missingCount: preview.missingDocuments.length,
    reliabilityNotes: preview.reliabilityNotes,
    availableDocuments: preview.availableDocuments,
    missingDocuments: preview.missingDocuments,
    optionalDocuments: preview.optionalDocuments,
    inventory: preview.inventory,
  }
}

function extractWorkflow(detail: CaseDetailResponse) {
  return ((detail.workflowState || {}) as Record<string, unknown>) || {}
}

function buildResolvedAnalysisPayload(
  analysis: AnalysisResponseData,
  workflow: Record<string, unknown>,
  detail: CaseDetailResponse,
) {
  const workflowDocuments = ((workflow.documents || {}) as DocumentIntelligencePayload) || {}
  const workflowVerdict = ((workflow.verdict || {}) as AnalysisResponseData['verdict']) || {}
  const workflowSimilarCases =
    (((workflow.similar_cases || {}) as { result?: AnalysisResponseData['similarCaseIntelligence'] }).result ||
      null) as AnalysisResponseData['similarCaseIntelligence'] | null
  const workflowTraces =
    ((workflow.traces || {}) as {
      pipelineTrace?: AnalysisResponseData['pipelineTrace']
      pipelineMeta?: AnalysisResponseData['pipelineMeta']
    }) || {}
  const resolvedDocumentIntelligence =
    hasObjectContent(analysis.documentIntelligence as Record<string, unknown>)
      ? analysis.documentIntelligence
      : hasObjectContent(workflowDocuments as Record<string, unknown>)
        ? workflowDocuments
        : null
  const resolvedVerdict =
    hasObjectContent((analysis.verdict || {}) as Record<string, unknown>)
      ? analysis.verdict
      : hasObjectContent((workflowVerdict || {}) as Record<string, unknown>)
        ? workflowVerdict
        : undefined
  const resolvedSimilarCaseIntelligence =
    hasObjectContent((analysis.similarCaseIntelligence || {}) as Record<string, unknown>)
      ? analysis.similarCaseIntelligence
      : hasObjectContent((workflowSimilarCases || {}) as Record<string, unknown>)
        ? workflowSimilarCases
        : null
  const resolvedPipelineMeta =
    hasObjectContent((analysis.pipelineMeta || {}) as Record<string, unknown>)
      ? analysis.pipelineMeta
      : hasObjectContent((workflowTraces.pipelineMeta || {}) as Record<string, unknown>)
        ? workflowTraces.pipelineMeta
        : undefined

  const nextAnalysis: AnalysisResponseData = {
    ...analysis,
    documentIntelligence: resolvedDocumentIntelligence,
    verdict: resolvedVerdict,
    similarCaseIntelligence: resolvedSimilarCaseIntelligence,
    pipelineTrace:
      analysis.pipelineTrace?.length ? analysis.pipelineTrace : workflowTraces.pipelineTrace || [],
    pipelineMeta: resolvedPipelineMeta,
    caseMeta: {
      case_id: detail.case_id,
      created_at: detail.created_at,
    },
  }

  const hasMeaningfulAnalysis = Boolean(
    hasObjectContent((nextAnalysis.documentIntelligence || {}) as Record<string, unknown>) ||
      hasObjectContent((nextAnalysis.caseAssessment || {}) as Record<string, unknown>) ||
      hasObjectContent((nextAnalysis.verdict || {}) as Record<string, unknown>) ||
      hasObjectContent((nextAnalysis.similarCaseIntelligence || {}) as Record<string, unknown>) ||
      nextAnalysis.pipelineTrace?.length,
  )

  return {
    nextAnalysis,
    hasMeaningfulAnalysis,
  }
}

export function useAnalysisWorkspace(caseId?: string) {
  const { activeCaseId, setActiveCaseId, clearActiveCaseId } = useActiveCase()
  const [resolvedCaseId, setResolvedCaseId] = useState(caseId || activeCaseId || '')
  const [storedCase, setStoredCase] = useState<Partial<StoredCaseContext> | null>(null)
  const [latestAnalysis, setLatestAnalysis] = useState<AnalysisResponseData | null>(null)
  const [workflowState, setWorkflowState] = useState<Record<string, unknown> | null>(null)
  const [recentCases, setRecentCases] = useState<CaseHistoryItem[]>(
    getRecentCases<CaseHistoryItem[]>() || [],
  )
  const [loading, setLoading] = useState(Boolean(caseId || activeCaseId))
  const [error, setError] = useState('')

  useEffect(() => {
    const nextCaseId = caseId || activeCaseId || ''

    if (nextCaseId) {
      setResolvedCaseId(nextCaseId)
      return
    }

    setResolvedCaseId('')
    setStoredCase(null)
    setLatestAnalysis(null)
    setWorkflowState(null)
    setLoading(false)
  }, [activeCaseId, caseId])

  useEffect(() => {
    caseService
      .listCases()
      .then((response) => {
        const cases = response.cases || []
        setRecentCases(cases)
        saveRecentCases(cases)
      })
      .catch(() => {
        setRecentCases(getRecentCases<CaseHistoryItem[]>() || [])
      })
  }, [])

  useEffect(() => {
    if (!resolvedCaseId) {
      setWorkflowState(null)
      setLoading(false)
      return
    }

    setLoading(true)
    setError('')

    caseService
      .getCaseState(resolvedCaseId)
      .then((detail) => {
        const caseInput = (detail.caseInput || {}) as Record<string, unknown>
        const workflow = extractWorkflow(detail)
        const intake = ((workflow.intake || {}) as Record<string, unknown>) || {}
        const documents = ((workflow.documents || {}) as Record<string, unknown>) || {}
        const analysis =
          ((((workflow.analysis || {}) as Record<string, unknown>).response ||
            detail.analysisResult ||
            {}) as AnalysisResponseData) || {}
        const documentationPreview = toDocumentationPreview(documents)

        const nextCase: StoredCaseContext = {
          caseId: detail.case_id,
          category: String(intake.category || caseInput.category || 'general-dispute'),
          description: String(
            intake.description ||
              caseInput.description ||
              caseInput.caseText ||
              defaultCaseContext.description,
          ),
          jurisdiction: String(
            intake.jurisdiction || caseInput.jurisdiction || defaultCaseContext.jurisdiction,
          ),
          fileCount: Number(
            intake.file_count ||
              caseInput.fileCount ||
              (documents.case_submission as { uploadedDocumentCount?: number } | undefined)
                ?.uploadedDocumentCount ||
              0,
          ),
          documentationPreview,
        }

        const { nextAnalysis, hasMeaningfulAnalysis } = buildResolvedAnalysisPayload(
          analysis,
          workflow,
          detail,
        )

        if (detail.case_id) {
          setActiveCaseId(detail.case_id)
        }
        setStoredCase(nextCase)
        setLatestAnalysis(hasMeaningfulAnalysis ? nextAnalysis : null)
        setWorkflowState(workflow)
      })
      .catch((caughtError) => {
        if (
          getApiErrorMessage(caughtError, '').toLowerCase().includes('case not found') &&
          resolvedCaseId === activeCaseId
        ) {
          clearActiveCaseId()
        }
        setStoredCase(null)
        setLatestAnalysis(null)
        setWorkflowState(null)
        setError(getApiErrorMessage(caughtError, 'Unable to load this case workspace.'))
      })
      .finally(() => setLoading(false))
  }, [activeCaseId, clearActiveCaseId, resolvedCaseId, setActiveCaseId])

  const hasStoredAnalysis = useMemo(
    () =>
      Boolean(
        hasObjectContent((latestAnalysis?.caseAssessment || {}) as Record<string, unknown>) ||
          hasObjectContent((latestAnalysis?.verdict || {}) as Record<string, unknown>) ||
          latestAnalysis?.pipelineTrace?.length,
      ),
    [latestAnalysis],
  )

  return useMemo(
    () => ({
      activeCaseId: resolvedCaseId || activeCaseId,
      storedCase,
      latestAnalysis,
      workflowState,
      caseContext: toStoredCaseContext(storedCase),
      hasStoredCase: Boolean(storedCase?.caseId),
      hasStoredAnalysis,
      recentCases,
      loading,
      error,
    }),
    [activeCaseId, error, hasStoredAnalysis, latestAnalysis, loading, recentCases, resolvedCaseId, storedCase, workflowState],
  )
}
