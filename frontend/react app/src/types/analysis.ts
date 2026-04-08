import { DocumentIntelligencePayload, FeedbackInsight, SimilarCaseIntelligenceResponse } from '../services/caseService'
import { DocumentChecklistItem, FrontendDocumentInventoryItem } from '../features/caseInput/documentIntelligence'

export interface LearningProfile {
  summary?: string
  feedbackCount?: number
  relevantFeedbackCount?: number
  averageRating?: number | null
}

export interface VerdictResult {
  verdict?: string
  confidence?: number
  reasoning?: string
  learningSummary?: string
  verdict_summary?: string
  win_probability?: number
  loss_probability?: number
  settlement_probability?: number
  confidence_score?: number
  outcome_indicators?: {
    bail_probability?: VerdictIndicator
    expected_duration?: VerdictIndicator
    cost_estimate?: VerdictIndicator
    fine_or_cost_estimate?: VerdictIndicator
    next_stage_probability?: VerdictIndicator
  }
  improvement_actions?: VerdictImprovementAction[]
  verdict_layers?: VerdictLayer[]
  reasoning_panel?: VerdictReasoningPanel
  strategy_panel?: VerdictStrategyPanel
  uncertainty_flags?: string[]
  structured_synthesis?: StructuredLegalSynthesis
  human_factors?: HumanFactorsAssessment
  probability_support_profile?: ProbabilitySupportProfile
  supporting_context?: {
    case_strength_score?: number
    similar_case_count?: number
    feedback_learning_summary?: string
    human_factors_summary?: string
  }
  similar_case_intelligence?: SimilarCaseIntelligenceResponse
  similarCases?: Array<{
    caseId?: string
    title?: string
    score?: number
    summary?: string
  }>
}

export interface VerdictIndicator {
  value: number | string | null
  label: string
  certainty: 'supported' | 'uncertain' | 'not_applicable'
  reason: string
}

export interface VerdictImprovementAction {
  action: string
  reason: string
  expected_impact: string
  win_probability_delta?: number
}

export interface VerdictLayer {
  layer_name: string
  summary: string
  reasoning_points: string[]
  contributing_factors: string[]
  positive_signals?: StructuredFinding[]
  negative_signals?: StructuredFinding[]
  unresolved_points?: string[]
  effect_on_outcome?: string
  source_basis?: string
}

export interface VerdictReasoningPanel {
  summary: string
  key_points: string[]
  uncertainty_note: string
}

export interface VerdictStrategyPanel {
  summary: string
  suggested_solutions: VerdictImprovementAction[]
  readiness_note: string
}

export interface PipelineTraceStage {
  key: string
  name: string
  summary: string
  status: 'pending' | 'running' | 'completed'
  detail: string
  meta?: {
    source?: string
    durationMs?: number | null
    model?: string | null
    issues?: string[]
  } | null
}

export interface DebatePayload {
  defense: string[]
  prosecution: string[]
  rebuttal: string[]
  balanceScore: number | null
}

export interface StructuredFinding {
  title: string
  detail: string
  source_basis: string
  effect_on_outcome: string
  confidence: number
}

export interface EmotionalSignal {
  signal_type: string
  source_text: string
  intensity: number
  relevance_to_case: number
  likely_effect_area: string[]
}

export interface HumanFactorsAssessment {
  signals: EmotionalSignal[]
  settlement_likelihood_effect: string
  credibility_pressure_effect: string
  narrative_coherence: string
}

export interface ProbabilitySupportProfile {
  evidence_support: number
  contradiction_exposure: number
  missing_documents: number
  legal_fit: number
  similar_case_support: number
  emotional_narrative_leverage: number
  uncertainty_level: number
}

export interface StructuredLegalSynthesis {
  evidence_findings: StructuredFinding[]
  rule_findings: StructuredFinding[]
  similar_case_findings: StructuredFinding[]
  emotional_signal_findings: EmotionalSignal[]
  contradiction_findings: StructuredFinding[]
  missing_document_findings: StructuredFinding[]
  risk_findings: StructuredFinding[]
  strategy_findings: StructuredFinding[]
  feedback_insight_findings: StructuredFinding[]
  human_factors: HumanFactorsAssessment
  top_supporting_facts: StructuredFinding[]
  top_weaknesses: StructuredFinding[]
  uncertainty_drivers: string[]
  probability_support_profile: ProbabilitySupportProfile
}

export interface AdvisoryPayload {
  caseStrength?: {
    label: string
    userWinProbabilityPercent: number
    evidenceScore: number
    summary: string
  }
  evidenceGuidance?: {
    missingEvidence: string[]
    contradictions: string[]
    nextBestAction: string
  }
  settlementPosture?: string
  litigationRisk?: string
}

export interface EvidenceAnalysisItem {
  evidence_id: string
  type: string
  file_name: string
  category: string
  reliability_score: number
  reliability_label: string
  reliability_reason: string
  role: 'support' | 'weak' | 'neutral'
  usable_for_analysis: boolean
}

export interface AnalysisFindingPoint {
  title: string
  detail: string
}

export interface MissingDocumentImpactItem {
  type: string
  label: string
  impact_reason: string
  risk_introduced: string
}

export interface RecommendationItem {
  action: string
  reason: string
  expected_impact: string
}

export interface CaseAssessmentPayload {
  evidence_analysis: EvidenceAnalysisItem[]
  support_points: AnalysisFindingPoint[]
  weakness_points: AnalysisFindingPoint[]
  contradiction_points: AnalysisFindingPoint[]
  missing_document_impact: MissingDocumentImpactItem[]
  recommendations: RecommendationItem[]
  emotional_signal_findings?: EmotionalSignal[]
  human_factors?: HumanFactorsAssessment
  structured_signal_sources?: string[]
  reasoning_trace_summary: string
  case_strength_score: number
}

export interface AnalysisResponseData {
  documentIntelligence?: DocumentIntelligencePayload | null
  caseAssessment?: CaseAssessmentPayload | null
  verdict?: VerdictResult
  structured_synthesis?: StructuredLegalSynthesis | null
  human_factors?: HumanFactorsAssessment | null
  caseMeta?: {
    case_id: string
    created_at?: string
  }
  learningProfile?: LearningProfile
  pipelineTrace?: PipelineTraceStage[]
  debate?: DebatePayload
  advisory?: AdvisoryPayload
  riskScore?: number
  similarCaseIntelligence?: SimilarCaseIntelligenceResponse | null
  pipelineMeta?: {
    hasFeedbackMemory?: boolean
    legalResearchStrategy?: string | null
    graphCorrectionUsed?: boolean
    verdictSource?: string | null
  }
  feedbackInsights?: FeedbackInsight[]
}

export interface StoredCaseContext {
  caseId?: string
  category: string
  description: string
  jurisdiction: string
  fileCount: number
  documentationPreview?: {
    completenessScore: number
    readinessStatus: string
    availableCount: number
    missingCount: number
    reliabilityNotes?: string[]
    availableDocuments?: DocumentChecklistItem[]
    missingDocuments?: DocumentChecklistItem[]
    optionalDocuments?: Array<DocumentChecklistItem & { status?: string }>
    inventory?: FrontendDocumentInventoryItem[]
  }
}
