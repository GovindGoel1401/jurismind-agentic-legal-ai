import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { AlertTriangle, Database, MessageSquare, Radar } from 'lucide-react'
import { Link, useParams } from 'react-router-dom'
import StructuredFeedbackPanel from '../components/feedback/StructuredFeedbackPanel'
import ErrorMessage from '../components/ErrorMessage'
import EmptyState from '../components/shared/EmptyState'
import InfoCard from '../components/shared/InfoCard'
import PageHeader from '../components/shared/PageHeader'
import CaseWorkflowStepper from '../components/shared/CaseWorkflowStepper'
import { useAnalysisWorkspace } from '../hooks/useAnalysisWorkspace'
import { useCaseStageRedirect } from '../hooks/useCaseStageRedirect'
import { useLocalFeedbackStore } from '../hooks/useLocalFeedbackStore'
import caseService, { FeedbackPatternAlert } from '../services/caseService'
import { getApiErrorMessage } from '../services/api'
import { getDebateSession } from '../utils/debateSession'

export default function Feedback() {
  const { caseId: routeCaseId } = useParams()
  const caseId = useCaseStageRedirect('/feedback', routeCaseId)
  const { latestAnalysis, caseContext, hasStoredCase, hasStoredAnalysis, loading } = useAnalysisWorkspace(caseId)
  const { storedFeedback, addEntry } = useLocalFeedbackStore()
  const [feedbackInsights, setFeedbackInsights] = useState<
    Array<{
      insight_type: string
      related_pattern: string
      relevance_score: number
      supporting_feedback_refs: string[]
    }>
  >([])
  const [feedbackPatterns, setFeedbackPatterns] = useState<FeedbackPatternAlert[]>([])
  const [feedbackAlerts, setFeedbackAlerts] = useState<FeedbackPatternAlert[]>([])
  const [warningFlags, setWarningFlags] = useState<string[]>([])
  const [insightsError, setInsightsError] = useState('')

  const resolvedCaseId = caseId || 'latest-analysis'
  const debateSession = getDebateSession<Record<string, unknown>>()

  const loadFeedbackSignals = async () => {
    if (!hasStoredAnalysis) return

    try {
      if (caseId) {
        const response = await caseService.getCaseFeedback(caseId)
        setFeedbackInsights(response.insights || [])
        setFeedbackPatterns(response.patterns || [])
        setFeedbackAlerts(response.alerts || [])
        setWarningFlags(response.warning_flags || [])
        setInsightsError('')
        return
      }

      const response = await caseService.getFeedbackInsights({
        case_input: caseContext as unknown as Record<string, unknown>,
        filters: {
          case_id: resolvedCaseId,
        },
      })
      setFeedbackInsights(response.feedback_insights || [])
      setFeedbackPatterns([])
      setFeedbackAlerts([])
      setWarningFlags([])
      setInsightsError('')
    } catch (caughtError) {
      setFeedbackInsights([])
      setFeedbackPatterns([])
      setFeedbackAlerts([])
      setWarningFlags([])
      setInsightsError(getApiErrorMessage(caughtError, 'Feedback insights are unavailable right now.'))
    }
  }

  useEffect(() => {
    void loadFeedbackSignals()
  }, [hasStoredAnalysis, caseContext, resolvedCaseId, caseId])

  if (loading) {
    return (
      <div className="page-shell">
        <PageHeader eyebrow="Phase 6" title="Feedback Intelligence" description="Loading case workspace..." />
      </div>
    )
  }

  return (
    <div className="page-shell space-y-6">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
        <PageHeader
          eyebrow="Phase 6"
          title="Feedback Intelligence"
          description={`Structured, auditable feedback for case ${resolvedCaseId}.`}
        />

        <CaseWorkflowStepper />

        {!hasStoredCase ? (
          <section className="panel mt-6">
            <EmptyState
              title="No active case selected"
              description="Create or select a case first so feedback can be tied to the current case workspace."
              actionLabel="Run a Case Analysis"
              actionHref="/case-input"
            />
          </section>
        ) : !hasStoredAnalysis ? (
          <section className="panel mt-6">
            <EmptyState
              title="Analysis not completed for this case yet"
              description="Feedback is more useful once analysis and verdict outputs exist for the active case."
              actionLabel="Open Analysis"
              actionHref={caseId ? `/analysis/${caseId}` : '/analysis'}
            />
          </section>
        ) : (
          <>
            <section className="mt-6 grid gap-3 md:grid-cols-4">
              <InfoCard label="Case" value={resolvedCaseId} />
              <InfoCard label="Category" value={caseContext.category} />
              <InfoCard label="Jurisdiction" value={caseContext.jurisdiction} />
              <InfoCard label="Warning Flags" value={String(warningFlags.length)} />
            </section>

            {warningFlags.length ? (
              <section className="rounded-2xl border border-amber-400/20 bg-amber-400/10 p-4">
                <div className="flex items-start gap-3">
                  <AlertTriangle size={18} className="mt-0.5 text-amber-200" />
                  <div className="space-y-2">
                    <p className="text-sm font-semibold text-amber-50">Detected feedback warning signals</p>
                    {warningFlags.map((flag) => (
                      <p key={flag} className="text-sm leading-6 text-amber-100">
                        {flag}
                      </p>
                    ))}
                  </div>
                </div>
              </section>
            ) : null}

            <div className="mt-6 grid gap-6 xl:grid-cols-[1.15fr_0.85fr]">
              <StructuredFeedbackPanel
                caseId={caseId || latestAnalysis?.caseMeta?.case_id || resolvedCaseId}
                sessionId={String((debateSession as { session_memory?: { session_id?: string } })?.session_memory?.session_id || '')}
                phaseContext="feedback_page"
                linkedFeature="feedback_hub"
                caseInput={caseContext as unknown as Record<string, unknown>}
                verdictSnapshot={(latestAnalysis?.verdict || {}) as Record<string, unknown>}
                recommendationSnapshot={latestAnalysis?.verdict?.improvement_actions}
                debateSessionSnapshot={debateSession}
                title="Submit structured feedback"
                description="Capture usefulness, corrections, missing context, and outcome signals in the separate feedback intelligence layer."
                onSubmitted={(entry) => {
                  addEntry({
                    id: `${Date.now()}`,
                    caseId: resolvedCaseId,
                    sessionId: String((debateSession as { session_memory?: { session_id?: string } })?.session_memory?.session_id || ''),
                    phaseContext: entry.phaseContext,
                    feedbackType: entry.feedbackType,
                    linkedFeature: entry.linkedFeature,
                    starRating: entry.rating,
                    summary: entry.summary,
                    submittedAt: new Date().toISOString(),
                  })
                  void loadFeedbackSignals()
                }}
              />

              <section className="panel">
                <div className="flex items-center gap-3">
                  <Radar size={18} className="text-sky-300" />
                  <div>
                    <h3 className="text-lg font-semibold text-legal-text">Feedback insight foundation</h3>
                    <p className="text-sm text-legal-muted">These insights come only from the separate feedback layer, not the legal retrieval store.</p>
                  </div>
                </div>

                <div className="mt-5 space-y-3">
                  {insightsError ? <ErrorMessage title="Feedback Insights" message={insightsError} /> : null}
                  {feedbackInsights.length ? (
                    feedbackInsights.map((insight) => (
                      <div key={`${insight.insight_type}-${insight.related_pattern}`} className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
                        <p className="text-xs uppercase tracking-[0.16em] text-legal-muted">{insight.insight_type}</p>
                        <p className="mt-2 text-sm text-legal-text">{insight.related_pattern}</p>
                        <p className="mt-2 text-xs text-legal-muted">
                          Relevance: {Math.round(insight.relevance_score * 100)}% | Supporting refs: {insight.supporting_feedback_refs.join(', ')}
                        </p>
                      </div>
                    ))
                  ) : (
                    <div className="rounded-2xl border border-dashed border-white/10 px-4 py-5 text-sm text-legal-muted">
                      No feedback insights are available yet for this case context.
                    </div>
                  )}
                </div>
              </section>
            </div>

            <div className="grid gap-6 xl:grid-cols-2">
              <section className="panel">
                <div className="flex items-center gap-3">
                  <Radar size={18} className="text-rose-300" />
                  <div>
                    <h3 className="text-lg font-semibold text-legal-text">Pattern view</h3>
                    <p className="text-sm text-legal-muted">Aggregated recurring signals from similar feedback signatures.</p>
                  </div>
                </div>
                <div className="mt-5 space-y-3">
                  {feedbackPatterns.length ? (
                    feedbackPatterns.slice(0, 6).map((pattern) => (
                      <div key={pattern.pattern_id} className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
                        <p className="text-xs uppercase tracking-[0.16em] text-legal-muted">
                          {pattern.issue_tag} | {pattern.stage}
                        </p>
                        <p className="mt-2 text-sm text-legal-text">
                          Negative count: {pattern.negative_count} | Signal: {pattern.signal_strength}
                        </p>
                        <p className="mt-2 text-sm leading-6 text-legal-muted">{pattern.recommended_action}</p>
                      </div>
                    ))
                  ) : (
                    <div className="rounded-2xl border border-dashed border-white/10 px-4 py-5 text-sm text-legal-muted">
                      No aggregated feedback patterns yet.
                    </div>
                  )}
                </div>
              </section>

              <section className="panel">
                <div className="flex items-center gap-3">
                  <AlertTriangle size={18} className="text-amber-300" />
                  <div>
                    <h3 className="text-lg font-semibold text-legal-text">High-signal alerts</h3>
                    <p className="text-sm text-legal-muted">Secondary warning layer for repeated weak patterns. This does not override legal reasoning.</p>
                  </div>
                </div>
                <div className="mt-5 space-y-3">
                  {feedbackAlerts.length ? (
                    feedbackAlerts.slice(0, 6).map((alert) => (
                      <div key={`${alert.pattern_id}-alert`} className="rounded-2xl border border-amber-400/20 bg-amber-400/10 p-4">
                        <p className="text-xs uppercase tracking-[0.16em] text-amber-100">
                          {alert.issue_tag} | {alert.signal_strength}
                        </p>
                        <p className="mt-2 text-sm text-white">
                          {alert.case_type} / {alert.jurisdiction} / {alert.evidence_band}
                        </p>
                        <p className="mt-2 text-sm leading-6 text-amber-100">{alert.recommended_action}</p>
                      </div>
                    ))
                  ) : (
                    <div className="rounded-2xl border border-dashed border-white/10 px-4 py-5 text-sm text-legal-muted">
                      No high-signal alerts for this case yet.
                    </div>
                  )}
                </div>
              </section>
            </div>

            <section className="panel">
              <div className="flex items-center gap-3">
                <Database size={18} className="text-amber-300" />
                <div>
                  <h3 className="text-lg font-semibold text-legal-text">Local backup trace</h3>
                  <p className="text-sm text-legal-muted">Recent feedback entries cached on this device for resilience.</p>
                </div>
              </div>

              <div className="mt-5 space-y-3">
                {storedFeedback.length ? (
                  storedFeedback.slice(0, 6).map((entry) => (
                    <div key={entry.id} className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
                      <p className="text-xs uppercase tracking-[0.16em] text-legal-muted">
                        {entry.phaseContext} | {entry.feedbackType}
                      </p>
                      <p className="mt-2 text-sm text-legal-text">{entry.summary}</p>
                      <p className="mt-2 text-xs text-legal-muted">Case: {entry.caseId}</p>
                    </div>
                  ))
                ) : (
                  <div className="rounded-2xl border border-dashed border-white/10 px-4 py-5 text-sm text-legal-muted">
                    No cached feedback yet.
                  </div>
                )}
              </div>
            </section>

            <section className="rounded-2xl border border-emerald-400/20 bg-emerald-400/10 p-4">
              <div className="flex items-start gap-3">
                <MessageSquare size={18} className="mt-0.5 text-emerald-200" />
                <p className="text-sm leading-6 text-emerald-100">
                  Feedback is stored separately from statutes, similar cases, and other canonical legal sources. This phase builds a disciplined feedback intelligence layer, not a self-training legal truth source.
                </p>
              </div>
            </section>

            <section className="panel">
              <div className="flex flex-wrap gap-3">
                <Link
                  to={latestAnalysis?.caseMeta?.case_id ? `/knowledge-graph/${latestAnalysis.caseMeta.case_id}` : '/knowledge-graph'}
                  className="rounded-xl border border-white/15 px-4 py-2 text-sm font-semibold text-legal-text"
                >
                  Open Knowledge Graph
                </Link>
                <Link
                  to={latestAnalysis?.caseMeta?.case_id ? `/analysis/${latestAnalysis.caseMeta.case_id}` : '/analysis'}
                  className="rounded-xl border border-white/15 px-4 py-2 text-sm font-semibold text-legal-text"
                >
                  Back To Analysis
                </Link>
                <Link
                  to={latestAnalysis?.caseMeta?.case_id ? `/verdict/${latestAnalysis.caseMeta.case_id}` : '/verdict'}
                  className="btn-legal"
                >
                  Back To Verdict
                </Link>
              </div>
            </section>
          </>
        )}
      </motion.div>
    </div>
  )
}
