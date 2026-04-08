import { useEffect, useMemo, useState } from 'react'
import DocumentChecklistPanel from '../components/case-input/DocumentChecklistPanel'
import EvidenceInventoryTable from '../components/case-input/EvidenceInventoryTable'
import ReadinessSummaryCard from '../components/case-input/ReadinessSummaryCard'
import CaseStrengthOverview from '../components/analysis/CaseStrengthOverview'
import EvidenceReliabilityPanel from '../components/analysis/EvidenceReliabilityPanel'
import FindingsPanels from '../components/analysis/FindingsPanels'
import MissingDocumentImpactPanel from '../components/analysis/MissingDocumentImpactPanel'
import RecommendationPanel from '../components/analysis/RecommendationPanel'
import ReasoningTracePanel from '../components/analysis/ReasoningTracePanel'
import { Agent, AgentCard, AgentStatus, DebateMessage, PipelineNode } from '../components/legal'
import { AnimatePresence, motion } from 'framer-motion'
import { X } from 'lucide-react'
import { Link, useParams } from 'react-router-dom'
import ErrorMessage from '../components/ErrorMessage'
import EmptyState from '../components/shared/EmptyState'
import InfoCard from '../components/shared/InfoCard'
import PageHeader from '../components/shared/PageHeader'
import CaseWorkflowStepper from '../components/shared/CaseWorkflowStepper'
import Skeleton from '../components/ui/Skeleton'
import { useAnalysisWorkspace } from '../hooks/useAnalysisWorkspace'
import { useCaseStageRedirect } from '../hooks/useCaseStageRedirect'
import { PipelineTraceStage } from '../types/analysis'
import { DocumentChecklistEntry, EvidenceInventoryEntry } from '../services/caseService'

const agents: Agent[] = [
  { key: 'case-interpreter', name: 'Case Interpreter' },
  { key: 'evidence-analyzer', name: 'Evidence Analyzer' },
  { key: 'legal-research', name: 'Legal Research Agent' },
  { key: 'defense', name: 'Defense Agent' },
  { key: 'prosecution', name: 'Prosecution Agent' },
  { key: 'judge', name: 'Judge Reasoning Agent' },
  { key: 'verdict', name: 'Verdict Generator' },
]

const sequence: string[][] = [
  ['case-interpreter'],
  ['evidence-analyzer'],
  ['legal-research'],
  ['defense', 'prosecution'],
  ['judge'],
  ['verdict'],
]

interface StepInfo {
  key: string
  title: string
  procedure: string
}

const stepInfoMap: Record<string, StepInfo> = {
  'case-interpreter': {
    key: 'case-interpreter',
    title: 'Case Interpreter',
    procedure:
      'Normalizes your input facts, identifies parties and timeline, and converts the narrative into structured legal claims.',
  },
  'evidence-analyzer': {
    key: 'evidence-analyzer',
    title: 'Evidence Analyzer',
    procedure:
      'Scores uploaded evidence by relevance, consistency, and admissibility indicators, then flags weak or missing support.',
  },
  'legal-research': {
    key: 'legal-research',
    title: 'Legal Research',
    procedure:
      'Retrieves statutes and similar precedents through RAG and links each result to facts in your case.',
  },
  defense: {
    key: 'defense',
    title: 'Defense',
    procedure:
      'Builds arguments favoring claimant relief, prioritizing procedural compliance, burden gaps, and supporting precedents.',
  },
  prosecution: {
    key: 'prosecution',
    title: 'Prosecution',
    procedure:
      'Builds counter-arguments around liability, factual contradictions, and evidentiary support for the opposing side.',
  },
  judge: {
    key: 'judge',
    title: 'Judge Reasoning Agent',
    procedure:
      'Compares both argument graphs, applies legal weighting, and determines the strongest legally supported pathway.',
  },
  verdict: {
    key: 'verdict',
    title: 'Verdict Generator',
    procedure:
      'Produces final outcome probabilities, rationale summary, and recommended next legal action.',
  },
}

export default function AIAnalysis() {
  const { caseId: routeCaseId } = useParams()
  const caseId = useCaseStageRedirect('/analysis', routeCaseId)
  const [booting, setBooting] = useState(true)
  const [step, setStep] = useState(0)
  const [activeStepInfo, setActiveStepInfo] = useState<StepInfo | null>(null)
  const {
    caseContext,
    latestAnalysis,
    hasStoredCase,
    hasStoredAnalysis,
    recentCases,
    loading,
    error,
  } = useAnalysisWorkspace(caseId)
  const debate = useMemo(() => latestAnalysis?.debate || null, [latestAnalysis])
  const pipelineTrace = useMemo(() => latestAnalysis?.pipelineTrace || [], [latestAnalysis])
  const caseAssessment = useMemo(() => latestAnalysis?.caseAssessment || null, [latestAnalysis])
  const documentPreview = useMemo(() => caseContext.documentationPreview || null, [caseContext.documentationPreview])
  const documentIntelligence = useMemo(() => latestAnalysis?.documentIntelligence || null, [latestAnalysis])
  const structuredSynthesis = useMemo(() => latestAnalysis?.structured_synthesis || null, [latestAnalysis])
  const humanFactors = useMemo(() => latestAnalysis?.human_factors || null, [latestAnalysis])
  const effectiveReadinessStatus =
    documentIntelligence?.readiness_status || documentPreview?.readinessStatus || 'DESCRIPTION_ONLY'
  const effectiveCompletenessScore =
    documentIntelligence?.completeness_score || documentPreview?.completenessScore || 0
  const effectiveReliabilityNotes =
    documentIntelligence?.initial_reliability_notes?.length
      ? documentIntelligence.initial_reliability_notes
      : documentPreview?.reliabilityNotes?.length
        ? documentPreview.reliabilityNotes
        : ['JurisMind is using the current case description to suggest the next most helpful documents.']
  const documentInventory = useMemo(
    () => {
      if (documentIntelligence?.evidence_inventory?.length) {
        return ((documentIntelligence.evidence_inventory || []) as EvidenceInventoryEntry[]).map((item) => ({
          id: item.id,
          name: item.file_name,
          detectedType: item.detected_type,
          detectedCategory: item.category,
          description: item.basic_description,
          confidence: item.confidence,
          reliabilityLabel: item.reliability_label,
          inventoryStatus: item.inventory_status,
          usableForAnalysis: item.usable_for_analysis,
          sizeBytes: item.size_bytes,
        }))
      }
      return documentPreview?.inventory || []
    },
    [documentIntelligence, documentPreview],
  )
  const availableDocuments = useMemo(
    () =>
      ((documentIntelligence?.available_documents || documentPreview?.availableDocuments || []) as DocumentChecklistEntry[]),
    [documentIntelligence, documentPreview],
  )
  const missingDocuments = useMemo(
    () =>
      ((documentIntelligence?.missing_documents || documentPreview?.missingDocuments || []) as DocumentChecklistEntry[]),
    [documentIntelligence, documentPreview],
  )
  const optionalDocuments = useMemo(
    () =>
      ((documentIntelligence?.optional_documents || documentPreview?.optionalDocuments || []) as DocumentChecklistEntry[]),
    [documentIntelligence, documentPreview],
  )

  useEffect(() => {
    if (loading) {
      setBooting(true)
      return
    }
    if (!hasStoredAnalysis) {
      setBooting(false)
      return
    }
    const bootTimer = setTimeout(() => setBooting(false), 900)
    return () => clearTimeout(bootTimer)
  }, [hasStoredAnalysis, loading])

  useEffect(() => {
    if (booting || !hasStoredAnalysis || loading) return
    setStep(0)
    const id = setInterval(() => {
      setStep((current) => {
        if (current >= sequence.length) {
          clearInterval(id)
          return current
        }
        return current + 1
      })
    }, 1100)
    return () => clearInterval(id)
  }, [booting, hasStoredAnalysis, loading])

  const animatedStatusMap = useMemo(() => {
    const map: Record<string, AgentStatus> = {}
    sequence.forEach((group, groupIndex) => {
      group.forEach((key) => {
        if (groupIndex < step - 1) map[key] = 'completed'
        else if (groupIndex === step - 1) map[key] = step > sequence.length ? 'completed' : 'running'
        else map[key] = 'pending'
      })
    })
    return map
  }, [step])

  const traceStatusMap = useMemo(() => {
    const map: Record<string, PipelineTraceStage> = {}
    pipelineTrace.forEach((stage) => {
      map[stage.key] = stage
    })
    return map
  }, [pipelineTrace])

  const completedAgents = useMemo(
    () =>
      agents.filter((agent) => {
        const status = traceStatusMap[agent.key]?.status || animatedStatusMap[agent.key]
        return status === 'completed'
      }).length,
    [animatedStatusMap, traceStatusMap],
  )

  const completionPercent = Math.round((completedAgents / agents.length) * 100)

  return (
    <div className="page-shell space-y-6">
      <PageHeader
        eyebrow="Pipeline"
        title="Analysis"
        description="AI reasoning pipeline with agent status, legal flow, and debate simulation."
      />

      <CaseWorkflowStepper />

      <section className="panel">
        <div className="mt-4 grid gap-3 md:grid-cols-3">
          <InfoCard label="Case Category" value={caseContext.category} />
          <InfoCard label="Jurisdiction" value={caseContext.jurisdiction} />
          <InfoCard label="Evidence Files" value={caseContext.fileCount} />
        </div>
        <div className="mt-4 rounded-xl border border-white/10 bg-white/[0.03] px-4 py-4">
          <p className="text-xs uppercase tracking-wide text-legal-muted">Case Summary</p>
          <p className="mt-2 text-sm leading-6 text-legal-text">{caseContext.description}</p>
        </div>
        {!hasStoredCase ? (
          <div className="mt-4">
            <EmptyState
              title="No active case selected"
              description="Create or select a case first so JurisMind can load the saved analysis workspace for this session."
              actionLabel="Start Case Analysis"
              actionHref="/case-input"
            />
          </div>
        ) : !hasStoredAnalysis ? (
          <div className="mt-4">
            <EmptyState
              title="Analysis not completed for this case yet"
              description="This case workspace exists, but the full analysis pipeline has not completed yet. Return to case input if you want to rerun the analysis for this same case."
              actionLabel="Open Case Input"
              actionHref="/case-input"
            />
          </div>
        ) : null}
        {error ? <div className="mt-4"><ErrorMessage title="Case Workspace" message={error} /></div> : null}
        {latestAnalysis?.learningProfile?.summary && (
          <div className="mt-4 rounded-lg border border-legal-gold/20 bg-legal-card px-4 py-3 text-sm text-legal-muted">
            Feedback learning: {latestAnalysis.learningProfile.summary}
          </div>
        )}
      </section>

      {recentCases.length > 0 ? (
        <section className="panel">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h2 className="text-xl font-semibold text-legal-text">Recent Cases</h2>
              <p className="mt-1 text-sm text-legal-muted">Reopen saved analysis workspaces by case ID.</p>
            </div>
            {latestAnalysis?.caseMeta?.case_id ? (
              <Link to={`/verdict/${latestAnalysis.caseMeta.case_id}`} className="btn-legal">
                Open Verdict
              </Link>
            ) : null}
          </div>
          <div className="mt-4 grid gap-3 md:grid-cols-2">
            {recentCases.slice(0, 4).map((item) => {
              const caseItem = item as { case_id: string; category: string; verdict_label: string }
              return (
                <Link
                  key={caseItem.case_id}
                  to={`/analysis/${caseItem.case_id}`}
                  className="rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3 text-sm text-legal-text transition hover:border-amber-400/30"
                >
                  <p className="font-medium">{caseItem.category}</p>
                  <p className="mt-1 text-legal-muted">{caseItem.verdict_label}</p>
                  <p className="mt-2 text-xs text-legal-muted">Case ID: {caseItem.case_id}</p>
                </Link>
              )
            })}
          </div>
        </section>
      ) : null}

      {documentIntelligence || documentPreview ? (
        <section className="panel">
          <div className="flex items-start gap-3">
            <div>
              <h2 className="text-xl font-semibold text-legal-text">Document Status Analysis</h2>
              <p className="mt-1 text-sm text-legal-muted">
                Required, missing, and optional records for this case, including what to collect next.
              </p>
            </div>
          </div>

          <div className="mt-5 space-y-5">
            <ReadinessSummaryCard
              completenessScore={effectiveCompletenessScore}
              readinessStatus={effectiveReadinessStatus}
              fileCount={documentIntelligence?.case_submission?.uploadedDocumentCount || caseContext.fileCount || 0}
              availableCount={availableDocuments.length}
              missingCount={missingDocuments.length}
              reliabilityNotes={effectiveReliabilityNotes}
            />

            <DocumentChecklistPanel
              availableDocuments={availableDocuments}
              missingDocuments={missingDocuments}
              optionalDocuments={optionalDocuments}
            />

            <EvidenceInventoryTable inventory={documentInventory} />
          </div>
        </section>
      ) : null}

      {caseAssessment ? (
        <>

          <CaseStrengthOverview
            caseStrengthScore={caseAssessment.case_strength_score}
            supportCount={caseAssessment.support_points.length}
            weaknessCount={caseAssessment.weakness_points.length}
            contradictionCount={caseAssessment.contradiction_points.length}
            readinessStatus={latestAnalysis?.documentIntelligence?.readiness_status}
          />

          <EvidenceReliabilityPanel evidenceAnalysis={caseAssessment.evidence_analysis} />

          <FindingsPanels
            supportPoints={caseAssessment.support_points}
            weaknessPoints={caseAssessment.weakness_points}
            contradictionPoints={caseAssessment.contradiction_points}
          />

          <MissingDocumentImpactPanel items={caseAssessment.missing_document_impact} />

          <RecommendationPanel recommendations={caseAssessment.recommendations} />

          <ReasoningTracePanel summary={caseAssessment.reasoning_trace_summary} />

          {(structuredSynthesis || humanFactors) ? (
            <section className="panel">
              <h2 className="text-xl font-semibold text-legal-text">Structured Synthesis</h2>
              <p className="mt-1 text-sm text-legal-muted">
                Legal, evidentiary, similar-case, and human-factor findings compressed into a single reasoning bundle.
              </p>
              <div className="mt-4 grid gap-4 lg:grid-cols-2">
                <div className="rounded-xl border border-white/10 bg-white/[0.03] p-4">
                  <p className="text-xs uppercase tracking-wide text-legal-muted">Top Weaknesses</p>
                  <div className="mt-3 space-y-2 text-sm text-legal-text">
                    {(structuredSynthesis?.top_weaknesses || []).slice(0, 3).map((item: { title?: string; detail?: string }) => (
                      <p key={`${item.title}-${item.detail}`} className="rounded-lg border border-white/10 bg-slate-950/40 px-3 py-2">
                        {item.title}: {item.detail}
                      </p>
                    ))}
                  </div>
                </div>
                <div className="rounded-xl border border-white/10 bg-white/[0.03] p-4">
                  <p className="text-xs uppercase tracking-wide text-legal-muted">Human Factors</p>
                  <p className="mt-3 text-sm text-legal-text">
                    {humanFactors?.settlement_likelihood_effect || 'No explicit human-factor summary available.'}
                  </p>
                  <div className="mt-3 space-y-2 text-sm text-legal-text">
                    {(humanFactors?.signals || []).slice(0, 3).map((signal: { signal_type: string; source_text: string }) => (
                      <p key={`${signal.signal_type}-${signal.source_text}`} className="rounded-lg border border-white/10 bg-slate-950/40 px-3 py-2">
                        {signal.signal_type}: {signal.source_text}
                      </p>
                    ))}
                  </div>
                </div>
              </div>
            </section>
          ) : null}
        </>
      ) : null}

      <section className="panel">
        <h2 className="text-xl font-semibold text-legal-text">Agent Status Board</h2>
        <div className="mt-3">
          <div className="mb-1 flex items-center justify-between text-xs text-legal-muted">
            <span>Pipeline completion</span>
            <span>{completionPercent}%</span>
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-slate-800">
            <div
              className="h-full bg-gradient-to-r from-legal-blue to-legal-gold transition-all duration-500"
              style={{ width: `${completionPercent}%` }}
            />
          </div>
        </div>
        {booting ? (
          <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
            {Array.from({ length: agents.length }).map((_, index) => (
              <Skeleton key={index} className="h-16" />
            ))}
          </div>
        ) : (
          <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
            {agents.map((agent) => (
              <AgentCard
                key={agent.key}
                name={agent.name}
                status={traceStatusMap[agent.key]?.status || animatedStatusMap[agent.key] || 'pending'}
                detail={traceStatusMap[agent.key]?.detail}
              />
            ))}
          </div>
        )}
      </section>

      <section className="panel">
        <h2 className="text-xl font-semibold text-legal-text">Reasoning Flow</h2>
        <div className="mt-4 max-w-2xl space-y-2">
          <button type="button" onClick={() => setActiveStepInfo(stepInfoMap['case-interpreter'])} className="w-full">
            <PipelineNode
              label="Case Interpreter"
              status={traceStatusMap['case-interpreter']?.status || animatedStatusMap['case-interpreter']}
            />
          </button>
          <p className="text-center text-legal-gold">{'\u2193'}</p>
          <button type="button" onClick={() => setActiveStepInfo(stepInfoMap['evidence-analyzer'])} className="w-full">
            <PipelineNode
              label="Evidence Analyzer"
              status={traceStatusMap['evidence-analyzer']?.status || animatedStatusMap['evidence-analyzer']}
            />
          </button>
          <p className="text-center text-legal-gold">{'\u2193'}</p>
          <button type="button" onClick={() => setActiveStepInfo(stepInfoMap['legal-research'])} className="w-full">
            <PipelineNode
              label="Legal Research"
              status={traceStatusMap['legal-research']?.status || animatedStatusMap['legal-research']}
            />
          </button>
          <div className="grid grid-cols-3 py-1 text-center text-legal-gold">
            <span>{'\u2199'}</span>
            <span />
            <span>{'\u2198'}</span>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <button type="button" onClick={() => setActiveStepInfo(stepInfoMap.defense)} className="w-full">
              <PipelineNode label="Defense" status={traceStatusMap.defense?.status || animatedStatusMap.defense} />
            </button>
            <button type="button" onClick={() => setActiveStepInfo(stepInfoMap.prosecution)} className="w-full">
              <PipelineNode
                label="Prosecution"
                status={traceStatusMap.prosecution?.status || animatedStatusMap.prosecution}
              />
            </button>
          </div>
          <p className="text-center text-legal-gold">{'\u2193'}</p>
          <button type="button" onClick={() => setActiveStepInfo(stepInfoMap.judge)} className="w-full">
            <PipelineNode label="Judge" status={traceStatusMap.judge?.status || animatedStatusMap.judge} />
          </button>
          <p className="text-center text-legal-gold">{'\u2193'}</p>
          <button type="button" onClick={() => setActiveStepInfo(stepInfoMap.verdict)} className="w-full">
            <PipelineNode
              label="Verdict"
              accent="highlight"
              status={traceStatusMap.verdict?.status || animatedStatusMap.verdict}
            />
          </button>
        </div>
        <p className="mt-4 text-xs text-legal-muted">
          Tip: click any node to view that step procedure.
        </p>
        {pipelineTrace.length > 0 ? (
          <div className="mt-4 rounded-md border border-slate-700 bg-legal-card px-4 py-3">
            <p className="text-xs uppercase tracking-wide text-legal-muted">Graph Trace</p>
            <p className="mt-2 text-sm text-legal-muted">
              {pipelineTrace.filter((stage) => stage.status === 'completed').length} of {pipelineTrace.length} stages
              completed from the latest backend analysis.
            </p>
          </div>
        ) : null}
      </section>

      <section className="panel">
        <h2 className="text-xl font-semibold text-legal-text">Debate Simulation</h2>
        {debate ? (
          <div className="mt-4 grid gap-4 lg:grid-cols-2">
            <div className="space-y-3">
              <p className="text-sm font-medium text-blue-300">Defense Arguments</p>
              {debate.defense.map((message, index) => (
                <DebateMessage key={message} side="defense" text={message} delay={index * 0.12} />
              ))}
            </div>
            <div className="space-y-3">
              <p className="text-sm font-medium text-amber-300">Prosecution Arguments</p>
              {debate.prosecution.map((message, index) => (
                <DebateMessage
                  key={message}
                  side="prosecution"
                  text={message}
                  delay={index * 0.12 + 0.15}
                />
              ))}
            </div>
          </div>
        ) : (
          <div className="mt-4 rounded-md border border-slate-700 bg-legal-card px-4 py-3 text-sm text-legal-muted">
            Backend debate output is not available for the latest analysis yet.
          </div>
        )}
        {debate?.rebuttal?.length ? (
          <div className="mt-4 rounded-md border border-legal-gold/20 bg-legal-card px-4 py-3">
            <p className="text-xs uppercase tracking-wide text-legal-muted">Rebuttal View</p>
            <div className="mt-3 space-y-2">
              {debate.rebuttal.map((point) => (
                <p key={point} className="text-sm text-legal-muted">
                  {point}
                </p>
              ))}
            </div>
          </div>
        ) : null}
        <div className="mt-4 rounded-md border border-legal-gold/20 bg-legal-card px-3 py-2 text-xs text-legal-muted">
          {debate
            ? 'Debate content is sourced from the latest backend legal analysis.'
            : 'This panel only renders backend-produced debate content. No frontend-generated substitute is shown.'}
        </div>
      </section>

      {latestAnalysis?.advisory ? (
        <section className="panel">
          <h2 className="text-xl font-semibold text-legal-text">Legal Advisory</h2>
          <div className="mt-4 grid gap-4 md:grid-cols-2">
            <InfoCard
              label="Case Strength"
              value={
                <p className="text-lg font-semibold text-legal-text">
                  {latestAnalysis.advisory.caseStrength?.label || 'Unavailable'}
                </p>
              }
              detail={latestAnalysis.advisory.caseStrength?.summary}
            />
            <InfoCard label="Settlement Posture" value={latestAnalysis.advisory.settlementPosture} />
            <InfoCard
              label="Missing Evidence Guidance"
              value={latestAnalysis.advisory.evidenceGuidance?.nextBestAction}
            />
            <InfoCard label="Litigation Risk" value={latestAnalysis.advisory.litigationRisk} />
          </div>
        </section>
      ) : null}

      {latestAnalysis?.caseMeta?.case_id ? (
        <section className="panel">
          <h2 className="text-xl font-semibold text-legal-text">Next Steps</h2>
          <p className="mt-2 text-sm text-legal-muted">
            Continue through the product flow using this saved case workspace.
          </p>
          <div className="mt-4 flex flex-wrap gap-3">
            <Link to={`/similar-cases/${latestAnalysis.caseMeta.case_id}`} className="rounded-xl border border-white/15 px-4 py-2 text-sm font-semibold text-legal-text">
              Review Similar Cases
            </Link>
            <Link to={`/knowledge-graph/${latestAnalysis.caseMeta.case_id}`} className="rounded-xl border border-white/15 px-4 py-2 text-sm font-semibold text-legal-text">
              Open Knowledge Graph
            </Link>
            <Link to={`/verdict/${latestAnalysis.caseMeta.case_id}`} className="btn-legal">
              Open Verdict Studio
            </Link>
            <Link to={`/debate/${latestAnalysis.caseMeta.case_id}`} className="rounded-xl border border-white/15 px-4 py-2 text-sm font-semibold text-legal-text">
              Open Debate Simulation
            </Link>
          </div>
        </section>
      ) : null}

      <AnimatePresence>
        {activeStepInfo && (
          <>
            <motion.button
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-[60] bg-black/55"
              onClick={() => setActiveStepInfo(null)}
            />
            <motion.div
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 14 }}
              className="fixed left-1/2 top-1/2 z-[70] w-[92%] max-w-md -translate-x-1/2 -translate-y-1/2 rounded-xl border border-legal-gold/30 bg-legal-card p-5"
            >
              <div className="mb-3 flex items-center justify-between">
                <h3 className="text-base font-semibold text-legal-text">{activeStepInfo.title}</h3>
                <button
                  onClick={() => setActiveStepInfo(null)}
                  className="rounded-md p-1 text-legal-muted hover:bg-legal-panel hover:text-legal-text"
                >
                  <X size={16} />
                </button>
              </div>
              <p className="text-sm leading-relaxed text-legal-muted">{activeStepInfo.procedure}</p>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  )
}
