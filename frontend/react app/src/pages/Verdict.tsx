import { Link, useParams } from 'react-router-dom'
import { AlertCircle, ArrowRight, BrainCircuit, Landmark, Scale, ShieldAlert, Sparkles } from 'lucide-react'
import { motion } from 'framer-motion'
import EmptyState from '../components/shared/EmptyState'
import ErrorMessage from '../components/ErrorMessage'
import PageHeader from '../components/shared/PageHeader'
import CaseWorkflowStepper from '../components/shared/CaseWorkflowStepper'
import VerdictImprovementList from '../components/verdict/VerdictImprovementList'
import VerdictLayerAccordion from '../components/verdict/VerdictLayerAccordion'
import VerdictMetricCard from '../components/verdict/VerdictMetricCard'
import { useAnalysisWorkspace } from '../hooks/useAnalysisWorkspace'
import { useCaseStageRedirect } from '../hooks/useCaseStageRedirect'
import type { VerdictIndicator, VerdictResult } from '../types/analysis'

function hasVerdictContent(value?: VerdictResult | null) {
  return Boolean(value && Object.keys(value).length > 0)
}

function formatPercent(value?: number | null) {
  if (value == null || Number.isNaN(Number(value))) return 'Unavailable'
  return `${Math.round(Number(value) * 100)}%`
}

function renderIndicatorValue(indicator?: VerdictIndicator) {
  if (!indicator) return 'Unavailable'
  if (indicator.value == null) return indicator.certainty === 'not_applicable' ? 'N/A' : 'Uncertain'
  if (typeof indicator.value === 'number') return `${Math.round(indicator.value * 100)}%`
  return indicator.value
}

function indicatorTone(indicator?: VerdictIndicator) {
  if (!indicator) return 'muted' as const
  if (indicator.certainty === 'supported') return 'default' as const
  if (indicator.certainty === 'not_applicable') return 'muted' as const
  return 'highlight' as const
}

export default function Verdict() {
  const { caseId: routeCaseId } = useParams()
  const caseId = useCaseStageRedirect('/verdict', routeCaseId)
  const {
    latestAnalysis,
    caseContext,
    workflowState,
    hasStoredCase,
    hasStoredAnalysis,
    loading,
    error,
  } = useAnalysisWorkspace(caseId)
  const workflowVerdict =
    (((workflowState as { verdict?: VerdictResult } | null)?.verdict || {}) as VerdictResult) || undefined
  const verdict = hasVerdictContent(latestAnalysis?.verdict)
    ? latestAnalysis?.verdict
    : hasVerdictContent(workflowVerdict)
      ? workflowVerdict
      : undefined
  const outcomeIndicators = verdict?.outcome_indicators
  const layers = verdict?.verdict_layers || []
  const improvementActions = verdict?.improvement_actions || []
  const reasoningPanel = verdict?.reasoning_panel
  const strategyPanel = verdict?.strategy_panel
  const similarCaseSummary = verdict?.similar_case_intelligence || latestAnalysis?.similarCaseIntelligence
  const structuredSynthesis = verdict?.structured_synthesis || latestAnalysis?.structured_synthesis
  const humanFactors = verdict?.human_factors || latestAnalysis?.human_factors
  const documentReadiness =
    latestAnalysis?.documentIntelligence?.readiness_status ||
    ((workflowState as { documents?: { readiness_status?: string } } | null)?.documents?.readiness_status || 'Unavailable')
  const feedbackWarningFlags =
    ((workflowState as { feedback?: { warning_flags?: string[] } } | null)?.feedback?.warning_flags || [])

  if (loading) {
    return (
      <div className="page-shell">
        <PageHeader eyebrow="Phase 4" title="Verdict Studio" description="Loading case workspace..." />
      </div>
    )
  }

  if (!hasStoredCase) {
    return (
      <div className="page-shell">
        <PageHeader
          eyebrow="Phase 4"
          title="Verdict Studio"
          description="Structured outcome projection with layered legal reasoning."
        />
        <section className="panel mt-6">
          <EmptyState
            title="No active case selected"
            description="Create or select a case first so JurisMind can load the verdict workspace for the current session."
            actionLabel="Start Case Analysis"
            actionHref="/case-input"
          />
        </section>
      </div>
    )
  }

  if (!hasStoredAnalysis || !verdict) {
    return (
      <div className="page-shell">
        <PageHeader
          eyebrow="Phase 4"
          title="Verdict Studio"
          description="Structured outcome projection with layered legal reasoning."
        />
        <section className="panel mt-6">
          <EmptyState
            title="Analysis not completed for this case yet"
            description="This case exists, but the verdict cannot be built until the analysis pipeline finishes for the active case."
            actionLabel="Open Analysis"
            actionHref={caseId ? `/analysis/${caseId}` : '/analysis'}
          />
        </section>
      </div>
    )
  }

  return (
    <div className="page-shell space-y-6">
      <PageHeader
        eyebrow="Phase 4"
        title="Verdict Studio"
        description={`What is likely to happen in this case, and why. ${caseId ? `Reference: ${caseId}.` : ''}`}
      />

      <CaseWorkflowStepper />

      {error ? <ErrorMessage title="Verdict Workspace" message={error} /> : null}

      <section className="relative overflow-hidden rounded-[28px] border border-amber-400/20 bg-[radial-gradient(circle_at_top_left,_rgba(245,158,11,0.18),_transparent_35%),linear-gradient(135deg,rgba(15,23,42,0.96),rgba(2,6,23,0.96))] p-6 shadow-[0_30px_120px_-50px_rgba(245,158,11,0.45)]">
        <div className="absolute inset-y-0 right-0 hidden w-1/3 bg-[radial-gradient(circle_at_center,_rgba(59,130,246,0.18),_transparent_55%)] lg:block" />
        <div className="relative grid gap-6 lg:grid-cols-[1.5fr_0.9fr]">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-amber-400/20 bg-amber-400/10 px-3 py-1 text-xs uppercase tracking-[0.22em] text-amber-200">
              <Scale size={13} />
              Verdict Summary
            </div>
            <h2 className="mt-4 max-w-3xl text-3xl font-semibold text-white">
              {verdict.verdict_summary || verdict.verdict || 'Verdict unavailable'}
            </h2>
            <p className="mt-4 max-w-3xl text-sm leading-7 text-slate-300">
              {reasoningPanel?.summary || verdict.reasoning || 'Structured verdict reasoning is not available.'}
            </p>

            <div className="mt-6 grid gap-3 md:grid-cols-3">
              <div className="rounded-2xl border border-white/10 bg-white/[0.05] p-4">
                <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Win Probability</p>
                <p className="mt-2 text-3xl font-semibold text-emerald-300">
                  {formatPercent(verdict.win_probability)}
                </p>
              </div>
              <div className="rounded-2xl border border-white/10 bg-white/[0.05] p-4">
                <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Loss Probability</p>
                <p className="mt-2 text-3xl font-semibold text-rose-300">
                  {formatPercent(verdict.loss_probability)}
                </p>
              </div>
              <div className="rounded-2xl border border-white/10 bg-white/[0.05] p-4">
                <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Confidence Score</p>
                <p className="mt-2 text-3xl font-semibold text-amber-200">
                  {formatPercent(verdict.confidence_score || verdict.confidence)}
                </p>
              </div>
            </div>
          </div>

          <motion.aside
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.45 }}
            className="rounded-[24px] border border-white/10 bg-black/20 p-5 backdrop-blur-sm"
          >
            <div className="flex items-center gap-2 text-amber-200">
              <Sparkles size={18} />
              <h3 className="text-lg font-semibold">Case Snapshot</h3>
            </div>
            <div className="mt-4 space-y-3 text-sm text-slate-300">
              <p>
                <span className="text-slate-500">Category:</span> {caseContext.category}
              </p>
              <p>
                <span className="text-slate-500">Jurisdiction:</span> {caseContext.jurisdiction}
              </p>
              <p>
                <span className="text-slate-500">Evidence files:</span> {caseContext.fileCount}
              </p>
              <p>
                <span className="text-slate-500">Document readiness:</span> {documentReadiness}
              </p>
              <p>
                <span className="text-slate-500">Similar cases used:</span>{' '}
                {verdict.supporting_context?.similar_case_count ?? similarCaseSummary?.similar_cases?.length ?? 0}
              </p>
            </div>

            {verdict.uncertainty_flags?.length ? (
              <div className="mt-5 rounded-2xl border border-amber-400/20 bg-amber-400/10 p-4">
                <div className="flex items-center gap-2 text-amber-100">
                  <ShieldAlert size={16} />
                  <p className="text-sm font-medium">Uncertainty Signals</p>
                </div>
                <div className="mt-3 space-y-2">
                  {verdict.uncertainty_flags.map((item) => (
                    <p key={item} className="text-sm text-amber-50/90">
                      {item}
                    </p>
                  ))}
                </div>
              </div>
            ) : null}

            {feedbackWarningFlags.length ? (
              <div className="mt-5 rounded-2xl border border-rose-400/20 bg-rose-400/10 p-4">
                <p className="text-sm font-medium text-rose-100">Feedback warnings</p>
                <div className="mt-3 space-y-2">
                  {feedbackWarningFlags.map((flag) => (
                    <p key={flag} className="text-sm text-rose-50/90">
                      {flag}
                    </p>
                  ))}
                </div>
              </div>
            ) : null}

            <Link
              to={latestAnalysis?.caseMeta?.case_id ? `/similar-cases/${latestAnalysis.caseMeta.case_id}` : '/similar-cases'}
              className="mt-5 inline-flex items-center gap-2 text-sm font-medium text-amber-200 transition hover:text-amber-100"
            >
              Review comparable cases
              <ArrowRight size={14} />
            </Link>
          </motion.aside>
        </div>
      </section>

      <section className="grid gap-4 lg:grid-cols-4">
        <VerdictMetricCard
          eyebrow="Outcome Metrics"
          title="Bail Probability"
          value={renderIndicatorValue(outcomeIndicators?.bail_probability)}
          detail={outcomeIndicators?.bail_probability?.reason || 'Not available'}
          tone={indicatorTone(outcomeIndicators?.bail_probability)}
        />
        <VerdictMetricCard
          eyebrow="Outcome Metrics"
          title="Expected Duration"
          value={renderIndicatorValue(outcomeIndicators?.expected_duration)}
          detail={outcomeIndicators?.expected_duration?.reason || 'Not available'}
          tone={indicatorTone(outcomeIndicators?.expected_duration)}
        />
        <VerdictMetricCard
          eyebrow="Outcome Metrics"
          title="Cost / Fine Estimate"
          value={renderIndicatorValue(outcomeIndicators?.cost_estimate)}
          detail={outcomeIndicators?.cost_estimate?.reason || 'Not available'}
          tone={indicatorTone(outcomeIndicators?.cost_estimate)}
        />
        <VerdictMetricCard
          eyebrow="Outcome Metrics"
          title="Next Stage Probability"
          value={renderIndicatorValue(outcomeIndicators?.next_stage_probability)}
          detail={outcomeIndicators?.next_stage_probability?.reason || 'Not available'}
          tone={indicatorTone(outcomeIndicators?.next_stage_probability)}
        />
      </section>

      <section className="grid gap-6 xl:grid-cols-[1.25fr_0.85fr]">
        <div className="panel">
          <div className="flex items-center gap-3">
            <Landmark size={20} className="text-amber-300" />
            <div>
              <p className="text-xs uppercase tracking-[0.2em] text-legal-muted">Layered Verdict</p>
              <h2 className="text-xl font-semibold text-legal-text">How the verdict was formed</h2>
            </div>
          </div>
          <div className="mt-5">
            <VerdictLayerAccordion layers={layers} />
          </div>
        </div>

        <div className="space-y-6">
          {humanFactors ? (
            <section className="panel">
              <div className="flex items-center gap-3">
                <ShieldAlert size={20} className="text-amber-300" />
                <div>
                  <p className="text-xs uppercase tracking-[0.2em] text-legal-muted">Human Factors</p>
                  <h2 className="text-xl font-semibold text-legal-text">Narrative pressure and practical leverage</h2>
                </div>
              </div>
              <p className="mt-4 text-sm leading-7 text-legal-muted">
                {humanFactors.settlement_likelihood_effect || 'No explicit human-factor summary is available.'}
              </p>
              <div className="mt-4 space-y-2">
                {(humanFactors.signals || []).map((signal) => (
                  <div key={`${signal.signal_type}-${signal.source_text}`} className="rounded-xl border border-white/10 bg-white/[0.03] px-3 py-3 text-sm text-legal-text">
                    <p className="font-medium">{signal.signal_type}</p>
                    <p className="mt-1 text-legal-muted">{signal.source_text}</p>
                    <p className="mt-2 text-xs text-legal-muted">
                      Intensity: {Math.round(signal.intensity * 100)}% | Relevance: {Math.round(signal.relevance_to_case * 100)}%
                    </p>
                  </div>
                ))}
              </div>
              <div className="mt-4 rounded-xl border border-sky-400/15 bg-sky-400/10 px-4 py-3 text-sm text-sky-100">
                {humanFactors.credibility_pressure_effect || 'No credibility-pressure note available.'}
              </div>
            </section>
          ) : null}

          {structuredSynthesis ? (
            <section className="panel">
              <div className="flex items-center gap-3">
                <BrainCircuit size={20} className="text-sky-300" />
                <div>
                  <p className="text-xs uppercase tracking-[0.2em] text-legal-muted">Structured Synthesis</p>
                  <h2 className="text-xl font-semibold text-legal-text">Evidence, rules, similar-case, and risk signals</h2>
                </div>
              </div>
              <div className="mt-4 grid gap-3 md:grid-cols-2">
                <div className="rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3 text-sm text-legal-text">
                  <p className="text-xs uppercase tracking-[0.2em] text-legal-muted">Top Supporting Facts</p>
                  <p className="mt-2 text-legal-muted">{(structuredSynthesis.top_supporting_facts || []).map((item) => item.detail || item.title).slice(0, 2).join(' ') || 'Not enough structured support was extracted.'}</p>
                </div>
                <div className="rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3 text-sm text-legal-text">
                  <p className="text-xs uppercase tracking-[0.2em] text-legal-muted">Primary Weaknesses</p>
                  <p className="mt-2 text-legal-muted">{(structuredSynthesis.top_weaknesses || []).map((item) => item.detail || item.title).slice(0, 2).join(' ') || 'Not enough structured weakness signals were extracted.'}</p>
                </div>
              </div>
              <div className="mt-4 grid gap-3 md:grid-cols-3">
                <VerdictMetricCard
                  eyebrow="Synthesis"
                  title="Legal Fit"
                  value={`${Math.round((structuredSynthesis.probability_support_profile?.legal_fit || 0) * 100)}%`}
                  detail="How strongly the retrieved rule layer matches the case record."
                />
                <VerdictMetricCard
                  eyebrow="Synthesis"
                  title="Contradiction Exposure"
                  value={`${Math.round((structuredSynthesis.probability_support_profile?.contradiction_exposure || 0) * 100)}%`}
                  detail="How much contradiction pressure is visible in the structured record."
                />
                <VerdictMetricCard
                  eyebrow="Synthesis"
                  title="Emotional Leverage"
                  value={`${Math.round((structuredSynthesis.probability_support_profile?.emotional_narrative_leverage || 0) * 100)}%`}
                  detail="Whether human-context signals may affect negotiation or sympathy framing."
                />
              </div>
            </section>
          ) : null}

          <section className="panel">
            <div className="flex items-center gap-3">
              <BrainCircuit size={20} className="text-sky-300" />
              <div>
                <p className="text-xs uppercase tracking-[0.2em] text-legal-muted">View Reasoning</p>
                <h2 className="text-xl font-semibold text-legal-text">Reasoning Panel</h2>
              </div>
            </div>
            <p className="mt-4 text-sm leading-7 text-legal-muted">
              {reasoningPanel?.summary || verdict.reasoning || 'Reasoning panel unavailable.'}
            </p>
            <div className="mt-4 space-y-2">
              {(reasoningPanel?.key_points || []).map((point) => (
                <p key={point} className="rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2 text-sm text-legal-text">
                  {point}
                </p>
              ))}
            </div>
            <div className="mt-4 rounded-xl border border-amber-400/15 bg-amber-400/10 px-4 py-3 text-sm text-amber-100">
              {reasoningPanel?.uncertainty_note || 'No additional uncertainty note available.'}
            </div>
          </section>

          <section className="panel">
            <div className="flex items-center gap-3">
              <Sparkles size={20} className="text-emerald-300" />
              <div>
                <p className="text-xs uppercase tracking-[0.2em] text-legal-muted">Suggested Strategy / Solutions</p>
                <h2 className="text-xl font-semibold text-legal-text">Improvement Actions</h2>
              </div>
            </div>
            <p className="mt-4 text-sm leading-7 text-legal-muted">
              {strategyPanel?.summary || 'No strategy summary available.'}
            </p>
            <div className="mt-4">
              <VerdictImprovementList actions={improvementActions} />
            </div>
            <div className="mt-4 rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3 text-sm text-legal-muted">
              {strategyPanel?.readiness_note || 'Readiness note unavailable.'}
            </div>
          </section>
        </div>
      </section>

      {similarCaseSummary?.pattern_insights ? (
        <section className="panel">
          <div className="flex items-center gap-3">
            <Scale size={20} className="text-amber-300" />
            <div>
              <p className="text-xs uppercase tracking-[0.2em] text-legal-muted">Comparable Outcome Intelligence</p>
              <h2 className="text-xl font-semibold text-legal-text">Similar-case pattern signals</h2>
            </div>
          </div>
          <div className="mt-4 grid gap-4 md:grid-cols-3">
            <VerdictMetricCard
              eyebrow="Pattern Insight"
              title="Outcome Trend"
              value={similarCaseSummary.pattern_insights.outcome_trend}
              detail={similarCaseSummary.pattern_insights.confidence_note}
            />
            <VerdictMetricCard
              eyebrow="Pattern Insight"
              title="Timeline Trend"
              value={similarCaseSummary.pattern_insights.timeline_trend}
              detail={similarCaseSummary.pattern_insights.confidence_note}
            />
            <VerdictMetricCard
              eyebrow="Pattern Insight"
              title="Cost Pattern"
              value={similarCaseSummary.pattern_insights.cost_pattern}
              detail={similarCaseSummary.pattern_insights.confidence_note}
            />
          </div>
        </section>
      ) : null}

      <section className="rounded-2xl border border-amber-500/25 bg-amber-500/10 p-4">
        <div className="flex items-start gap-3">
          <AlertCircle size={18} className="mt-0.5 text-amber-300" />
          <p className="text-sm leading-6 text-amber-100">
            This Verdict Studio is explainable and structured, but it is still an AI-assisted legal estimate.
            Use it to understand likely outcomes, risks, and next improvements before speaking with a qualified
            legal professional.
          </p>
        </div>
      </section>

      <section className="panel">
        <div className="flex flex-wrap gap-3">
          <Link to={latestAnalysis?.caseMeta?.case_id ? `/knowledge-graph/${latestAnalysis.caseMeta.case_id}` : '/knowledge-graph'} className="rounded-xl border border-white/15 px-4 py-2 text-sm font-semibold text-legal-text">
            Open Knowledge Graph
          </Link>
          <Link to={latestAnalysis?.caseMeta?.case_id ? `/debate/${latestAnalysis.caseMeta.case_id}` : '/debate'} className="btn-legal">
            Continue To Debate Simulation
          </Link>
          <Link to={latestAnalysis?.caseMeta?.case_id ? `/feedback/${latestAnalysis.caseMeta.case_id}` : '/feedback'} className="rounded-xl border border-white/15 px-4 py-2 text-sm font-semibold text-legal-text">
            Continue To Feedback
          </Link>
        </div>
      </section>
    </div>
  )
}
