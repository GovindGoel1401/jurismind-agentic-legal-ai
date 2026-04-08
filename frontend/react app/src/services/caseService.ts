import apiClient from './api'

interface ApiEnvelope<T> {
  success?: boolean
  data?: T
  meta?: Record<string, unknown>
}

function unwrapEnvelope<T>(payload: ApiEnvelope<T> | T): T {
  if (
    payload &&
    typeof payload === 'object' &&
    'data' in (payload as Record<string, unknown>)
  ) {
    return (payload as ApiEnvelope<T>).data as T
  }

  return payload as T
}

export interface CaseSearchParams {
  query: string
  year?: number
  court?: string
  limit?: number
}

export interface CaseResult {
  id: number
  title: string
  year: number
  court: string
  relevance: number
}

export interface AnalyzeCasePayload {
  category: string
  description: string
  jurisdiction: string
  evidence?: Array<{
    name: string
    size: number
    type: string
  }>
}

export interface CaseHistoryItem {
  case_id: string
  category: string
  jurisdiction: string
  description: string
  created_at: string
  updated_at: string
  readiness_status: string
  verdict_label: string
}

export interface CaseDetailResponse {
  case_id: string
  caseInput: Record<string, unknown>
  analysisResult: Record<string, unknown>
  workflowState?: Record<string, unknown>
  created_at: string
  updated_at: string
}

export interface DocumentChecklistMatch {
  id?: string
  name?: string
  confidence?: number
  inventoryStatus?: string
}

export interface DocumentChecklistEntry {
  type: string
  label: string
  description: string
  status?: string
  matchedDocument?: DocumentChecklistMatch | null
}

export interface DetectedDocument {
  id: string
  originalName: string
  mimeType: string
  sizeBytes: number
  detectedType: string
  detectedCategory: string
  description: string
  confidence: number
  availabilityStatus: string
  inventoryStatus: string
  reliabilityLabel: string
  usableForAnalysis: boolean
  classifierSource: string
}

export interface EvidenceInventoryEntry {
  id: string
  file_name: string
  detected_type: string
  category: string
  basic_description: string
  usable_for_analysis: boolean
  confidence: number
  reliability_label: string
  inventory_status: string
  size_bytes: number
}

export interface DocumentIntelligencePayload {
  case_submission?: {
    category?: string
    jurisdiction?: string
    descriptionLength?: number
    uploadedDocumentCount?: number
  }
  caseMeta?: {
    case_id?: string
  }
  detected_documents?: DetectedDocument[]
  available_documents?: DocumentChecklistEntry[]
  missing_documents?: DocumentChecklistEntry[]
  optional_documents?: DocumentChecklistEntry[]
  evidence_inventory?: EvidenceInventoryEntry[]
  checklist?: {
    required?: DocumentChecklistEntry[]
    optional?: DocumentChecklistEntry[]
  }
  completeness_score?: number
  completeness_explanation?: string
  readiness_status?: string
  readiness_assessment?: {
    label?: string
    summary?: string
  }
  initial_reliability_notes?: string[]
}

export type FeedbackType =
  | 'advice_usefulness'
  | 'answer_correctness_concern'
  | 'updated_case_fact'
  | 'missing_context_provided_later'
  | 'actual_case_outcome'
  | 'user_comment'

export interface FeedbackCaseSignature {
  case_type?: string
  jurisdiction?: string
  evidence_level?: string
  doc_completeness?: number
  evidence_band?: string
}

export interface SubmitFeedbackPayload {
  case_id: string
  session_id?: string
  phase_context?: string
  feedback_type: FeedbackType
  linked_feature_or_agent?: string
  linked_output_reference?: string
  user_rating?: number
  verdict_helpful?: boolean
  analysis_helpful?: boolean
  debate_helpful?: boolean
  document_guidance_helpful?: boolean
  similar_cases_helpful?: boolean
  issue_tags?: string[]
  comment?: string
  case_signature?: FeedbackCaseSignature
  payload: Record<string, unknown>
  tags?: string[]
  metadata?: {
    case_input?: Record<string, unknown>
    ai_verdict?: Record<string, unknown>
    recommendation_snapshot?: unknown
    debate_session_snapshot?: unknown
  }
}

export interface FeedbackItemResponse {
  feedback_id?: string
  case_id: string
  session_id?: string
  phase_context?: string
  feedback_type: FeedbackType
  user_rating?: number | null
  verdict_helpful?: boolean | null
  analysis_helpful?: boolean | null
  debate_helpful?: boolean | null
  document_guidance_helpful?: boolean | null
  similar_cases_helpful?: boolean | null
  issue_tags?: string[]
  comment?: string
  case_signature?: FeedbackCaseSignature
  linked_feature_or_agent?: string
  linked_output_reference?: string
  payload: Record<string, unknown>
  created_at?: string
}

export interface FeedbackInsightsPayload {
  case_input?: Record<string, unknown>
  filters?: {
    case_id?: string
    session_id?: string
    feedback_type?: string
    phase_context?: string
    linked_feature_or_agent?: string
    tags?: string[]
    issue_tags?: string[]
  }
}

export interface FeedbackInsight {
  insight_type: string
  related_pattern: string
  relevance_score: number
  supporting_feedback_refs: string[]
}

export interface FeedbackPatternAlert {
  pattern_id: string
  case_type: string
  jurisdiction: string
  evidence_band: string
  evidence_level?: string
  stage: string
  issue_tag: string
  negative_count: number
  total_count?: number
  signal_strength: 'low' | 'medium' | 'high'
  recommended_action: string
  supporting_feedback_refs?: string[]
  last_seen?: string
}

export interface SimilarCasesPayload {
  query: string
  topK?: number
  category?: string
  jurisdiction?: string
  document_intelligence?: Record<string, unknown>
  case_assessment?: Record<string, unknown>
}

export interface SimilarCaseResult {
  case_id: string
  title: string
  summary: string
  similarity_score: number
  similarity_reasons: string[]
  matched_factors: string[]
  differences: string[]
  outcome_summary: {
    outcome: string
    timeline_range: string
    cost_pattern: string
    confidence_note: string
  }
  court?: string
  year?: number | string
}

export interface SimilarCaseIntelligenceResponse {
  similar_cases: SimilarCaseResult[]
  case_gap_analysis: string[]
  pattern_insights: {
    outcome_trend: string
    timeline_trend: string
    cost_pattern: string
    confidence_note: string
  }
  retrieval_layers: {
    canonical_legal: string
    case_specific: string
    similar_case: string
    feedback: string
  }
}

export type GraphPatternQueryType =
  | 'case_surface'
  | 'unsupported_claims'
  | 'contradictions'
  | 'human_factors'
  | 'missing_evidence_clusters'
  | 'unresolved_issues'
  | 'structural_similar_cases'
  | 'strategy_actions'

export interface KnowledgeGraphQueryPayload {
  case_id?: string
  issue?: string
  outcome?: string
  legal_rule?: string
  side?: '' | 'supporting' | 'opposing'
  limit?: number
}

export interface KnowledgeGraphPatternQueryPayload {
  case_id?: string
  query_type: GraphPatternQueryType
  risk_type?: string
  min_count?: number
  limit?: number
}

export interface KnowledgeGraphPatternResponse<T = unknown> {
  query_type: GraphPatternQueryType
  case_id: string
  result: T
}

export type DebateRole = 'defense' | 'prosecution'

export interface DebateQuestion {
  question_id: string
  role: DebateRole
  side: 'supporting' | 'opposing'
  text: string
  question: string
  priority?: 'high' | 'medium' | 'low'
  rationale?: string
  why_this_question_matters: string
  linked_issue_or_evidence: string
  issue_type?: string
  issue_reference?: string
  impact_axis?: string
  issue_category?: string
  issue_subtype?: string
  strategic_side?: string
  severity?: string
  followup_mode?: string
  dependency_on_previous_turn?: string
}

export interface DebateAnswerOption {
  option_id: string
  text: string
  impact: 'strengthens' | 'mixed' | 'weakens'
  reasoning: string
}

export interface DebateAnswerAnalysis {
  answer_options: DebateAnswerOption[]
  best_fit_answer: string
  answer_reasoning: string
  risk_note: string
  selected_answer_text?: string
  selected_answer_source?: 'suggested' | 'custom'
  custom_answer_evaluation?: {
    answer_text: string
    impact: string
    score: number
    reasoning: string
    risk_note: string
    linked_issue_type: string
  } | null
}

export interface DebateAnswerReview {
  summary: string
  new_facts: string[]
  contradictions: string[]
  missing_evidence_signals: string[]
  strength_impact: 'strengthened' | 'weakened' | 'neutral'
  notes: string
}

export interface DebateScenarioUpdate {
  scenario_delta_summary: string
  changed_factors: string[]
  updated_risk_flags: string[]
  updated_recommendations: string[]
  updated_outcome_shift: {
    previous_win_probability: number
    new_win_probability: number
    win_probability_delta: number
    previous_confidence_score: number
    new_confidence_score: number
    confidence_delta: number
    previous_case_strength_score: number
    new_case_strength_score: number
    case_strength_delta: number
  }
  answer_effect: {
    impact: string
    reasoning: string
    answer_text: string
  }
  debate_posture: {
    supporting_side: string
    opposing_side: string
  }
}

export interface DebateQuestionWithAnalysis extends DebateQuestion {
  answer_analysis: DebateAnswerAnalysis
}

export interface DebateUnresolvedIssue {
  issue: string
  priority: 'high' | 'medium' | 'low'
  source: 'analysis' | 'verdict' | 'debate' | 'evidence'
}

export interface DebateTurn {
  turn_id: string
  question_id: string
  role: DebateRole
  question: string
  user_answer: string
  answer_analysis: DebateAnswerReview
  agent_comment: string
  scenario_update?: DebateScenarioUpdate | null
  timestamp: string
}

export interface DebateSessionMemory {
  debate_session_id?: string
  session_id: string
  case_id?: string
  status?: 'active' | 'paused' | 'completed' | 'fallback'
  current_focus?: string
  current_question_id?: string
  current_question?: DebateQuestionWithAnalysis | null
  question_sets?: {
    defense: DebateQuestionWithAnalysis[]
    prosecution: DebateQuestionWithAnalysis[]
  }
  generated_questions: DebateQuestionWithAnalysis[]
  question_bank?: DebateQuestionWithAnalysis[]
  selected_question_id: string
  turns?: DebateTurn[]
  answer_history: DebateTurn[]
  scenario_changes: DebateScenarioUpdate[]
  unresolved_issues?: DebateUnresolvedIssue[]
  last_answer_review?: DebateAnswerReview | null
  retrieval_trace?: Array<Record<string, unknown>>
  debate_summary?: string
  working_state: {
    case_strength_score: number
    win_probability: number
    confidence_score: number
    risk_flags: string[]
    recommendations: string[]
    debate_posture: {
      supporting_side: string
      opposing_side: string
    }
  }
}

export interface DebateSimulationSessionPayload {
  case_input: Record<string, unknown>
  analysis: Record<string, unknown>
  verdict: Record<string, unknown>
  similar_case_intelligence: Record<string, unknown>
  session_memory?: Record<string, unknown> | null
}

export interface DebateSimulationSessionResponse {
  debate_session_id: string
  case_id?: string
  status?: string
  current_focus?: string
  debate_summary?: string
  current_question?: DebateQuestion | null
  question_sets?: {
    defense: DebateQuestion[]
    prosecution: DebateQuestion[]
  }
  generated_questions: DebateQuestion[]
  question_bank: DebateQuestionWithAnalysis[]
  unresolved_issues?: DebateUnresolvedIssue[]
  last_answer_review?: DebateAnswerReview | null
  retrieval_trace?: Array<Record<string, unknown>>
  timeline?: DebateTurn[]
  session_memory: DebateSessionMemory
}

export interface DebateSimulationApplyAnswerPayload {
  question_id: string
  selected_answer_option_id?: string
  custom_answer?: string
  session_memory: Record<string, unknown>
}

export interface DebateSimulationApplyAnswerResponse {
  debate_session_id: string
  status?: string
  current_focus?: string
  debate_summary?: string
  current_question?: DebateQuestion | null
  question_sets?: {
    defense: DebateQuestion[]
    prosecution: DebateQuestion[]
  }
  generated_questions: DebateQuestion[]
  question_bank: DebateQuestionWithAnalysis[]
  answer_analysis: DebateAnswerAnalysis
  last_answer_review?: DebateAnswerReview | null
  unresolved_issues?: DebateUnresolvedIssue[]
  retrieval_trace?: Array<Record<string, unknown>>
  timeline?: DebateTurn[]
  scenario_update: DebateScenarioUpdate
  session_memory: DebateSessionMemory
}

const caseService = {
  search: async (params: CaseSearchParams) => {
    const response = await apiClient.get('/cases/search', { params })
    return response.data
  },

  getById: async (id: number) => {
    const response = await apiClient.get(`/cases/${id}`)
    return response.data
  },

  listCases: async () => {
    const response = await apiClient.get('/api/cases')
    return unwrapEnvelope<{ cases: CaseHistoryItem[] }>(response.data)
  },

  getCaseDetail: async (caseId: string) => {
    const response = await apiClient.get(`/api/cases/${caseId}`)
    return unwrapEnvelope<CaseDetailResponse>(response.data)
  },

  getCaseState: async (caseId: string) => {
    const response = await apiClient.get(`/api/cases/${caseId}/state`)
    return unwrapEnvelope<CaseDetailResponse>(response.data)
  },

  createCase: async (payload: AnalyzeCasePayload) => {
    const response = await apiClient.post('/api/cases', payload)
    return unwrapEnvelope<CaseDetailResponse>(response.data)
  },

  analyzeCase: async (payload: AnalyzeCasePayload) => {
    const response = await apiClient.post('/api/analyze-case', payload)
    return unwrapEnvelope<Record<string, unknown>>(response.data)
  },

  runCaseAnalysis: async (caseId: string, payload: Partial<AnalyzeCasePayload>) => {
    const response = await apiClient.post(`/api/cases/${caseId}/analyze`, payload)
    return unwrapEnvelope<Record<string, unknown>>(response.data)
  },

  getCaseAnalysis: async (caseId: string) => {
    const response = await apiClient.get(`/api/cases/${caseId}/analysis`)
    return unwrapEnvelope<Record<string, unknown>>(response.data)
  },

  getDocumentIntelligence: async (payload: AnalyzeCasePayload) => {
    const response = await apiClient.post('/api/document-intelligence', payload)
    return unwrapEnvelope<DocumentIntelligencePayload>(response.data)
  },

  runCaseDocumentIntelligence: async (caseId: string, payload: Partial<AnalyzeCasePayload>) => {
    const response = await apiClient.post(`/api/cases/${caseId}/document-intelligence`, payload)
    return unwrapEnvelope<DocumentIntelligencePayload & { caseMeta?: { case_id: string } }>(
      response.data,
    )
  },

  getCaseDocumentIntelligence: async (caseId: string) => {
    const response = await apiClient.get(`/api/cases/${caseId}/document-intelligence`)
    return unwrapEnvelope<DocumentIntelligencePayload>(response.data)
  },

  findSimilarCases: async (payload: SimilarCasesPayload) => {
    const response = await apiClient.post('/api/similar-cases', payload)
    return unwrapEnvelope<SimilarCaseIntelligenceResponse>(response.data)
  },

  searchCaseSimilarCases: async (caseId: string, payload: Partial<SimilarCasesPayload>) => {
    const response = await apiClient.post(`/api/cases/${caseId}/similar-cases/search`, payload)
    return unwrapEnvelope<SimilarCaseIntelligenceResponse>(response.data)
  },

  getCaseSimilarCases: async (caseId: string) => {
    const response = await apiClient.get(`/api/cases/${caseId}/similar-cases`)
    return unwrapEnvelope<SimilarCaseIntelligenceResponse>(response.data)
  },

  queryKnowledgeGraph: async (payload: KnowledgeGraphQueryPayload) => {
    const response = await apiClient.post('/api/knowledge-graph/query', payload)
    return unwrapEnvelope<Record<string, unknown>>(response.data)
  },

  queryCaseKnowledgeGraph: async (
    caseId: string,
    payload: Omit<KnowledgeGraphQueryPayload, 'case_id'>,
  ) => {
    const response = await apiClient.post('/api/knowledge-graph/query', {
      ...payload,
      case_id: caseId,
    })
    return unwrapEnvelope<Record<string, unknown>>(response.data)
  },

  queryKnowledgeGraphPattern: async <T = unknown>(
    payload: KnowledgeGraphPatternQueryPayload,
  ) => {
    const response = await apiClient.post('/api/knowledge-graph/query/pattern', payload)
    return unwrapEnvelope<KnowledgeGraphPatternResponse<T>>(response.data)
  },

  queryCaseKnowledgeGraphPattern: async <T = unknown>(
    caseId: string,
    payload: Omit<KnowledgeGraphPatternQueryPayload, 'case_id'>,
  ) => {
    const response = await apiClient.post('/api/knowledge-graph/query/pattern', {
      ...payload,
      case_id: caseId,
    })
    return unwrapEnvelope<KnowledgeGraphPatternResponse<T>>(response.data)
  },

  initializeDebateSimulation: async (payload: DebateSimulationSessionPayload) => {
    const response = await apiClient.post('/api/debate-simulation/session', payload)
    return unwrapEnvelope<DebateSimulationSessionResponse>(response.data)
  },

  startCaseDebate: async (caseId: string, payload?: { reset?: boolean }) => {
    const response = await apiClient.post(`/api/cases/${caseId}/debate/start`, payload || {})
    return unwrapEnvelope<DebateSimulationSessionResponse>(response.data)
  },

  selectCaseDebateQuestion: async (
    caseId: string,
    payload: {
      question_id: string
    },
  ) => {
    const response = await apiClient.post(`/api/cases/${caseId}/debate/select-question`, payload)
    return unwrapEnvelope<DebateSimulationSessionResponse>(response.data)
  },

  applyDebateAnswer: async (payload: DebateSimulationApplyAnswerPayload) => {
    const response = await apiClient.post('/api/debate-simulation/apply-answer', payload)
    return unwrapEnvelope<DebateSimulationApplyAnswerResponse>(response.data)
  },

  answerCaseDebate: async (
    caseId: string,
    payload: {
      question_id: string
      selected_answer_option_id?: string
      custom_answer?: string
    },
  ) => {
    const response = await apiClient.post(`/api/cases/${caseId}/debate/answer`, payload)
    return unwrapEnvelope<DebateSimulationApplyAnswerResponse>(response.data)
  },

  getCaseDebate: async (caseId: string) => {
    const response = await apiClient.get(`/api/cases/${caseId}/debate`)
    return unwrapEnvelope<{
      debate_session_id?: string
      status?: string
      current_focus?: string
      debate_summary?: string
      current_question?: DebateQuestion | null
      question_sets?: {
        defense: DebateQuestion[]
        prosecution: DebateQuestion[]
      }
      question_bank?: DebateQuestionWithAnalysis[]
      session_memory?: DebateSessionMemory
      latest_scenario_update?: DebateScenarioUpdate | null
      latest_answer_analysis?: DebateAnswerAnalysis | null
      last_answer_review?: DebateAnswerReview | null
      unresolved_issues?: DebateUnresolvedIssue[]
      retrieval_trace?: Array<Record<string, unknown>>
    }>(response.data)
  },

  getCaseVerdict: async (caseId: string) => {
    const response = await apiClient.get(`/api/cases/${caseId}/verdict`)
    return unwrapEnvelope<Record<string, unknown>>(response.data)
  },

  submitFeedback: async (payload: SubmitFeedbackPayload) => {
    const endpoint =
      payload.case_id && payload.case_id !== 'latest-analysis'
        ? `/api/cases/${payload.case_id}/feedback`
        : '/api/feedback'
    const response = await apiClient.post(endpoint, payload)
    return unwrapEnvelope<{
      feedback_item: FeedbackItemResponse
      feedback_insights?: FeedbackInsight[]
      feedback_patterns?: FeedbackPatternAlert[]
      feedback_alerts?: FeedbackPatternAlert[]
    }>(response.data)
  },

  getCaseFeedback: async (caseId: string) => {
    const response = await apiClient.get(`/api/cases/${caseId}/feedback`)
    return unwrapEnvelope<{
      entries?: FeedbackItemResponse[]
      insights?: FeedbackInsight[]
      patterns?: FeedbackPatternAlert[]
      alerts?: FeedbackPatternAlert[]
      warning_flags?: string[]
    }>(response.data)
  },

  getFeedbackInsights: async (payload: FeedbackInsightsPayload) => {
    const response = await apiClient.post('/api/feedback/insights', payload)
    return unwrapEnvelope<{ feedback_insights: FeedbackInsight[] }>(response.data)
  },

  getFeedbackPatterns: async (params?: {
    case_id?: string
    phase_context?: string
    linked_feature_or_agent?: string
    issue_tag?: string
  }) => {
    const response = await apiClient.get('/api/feedback/internal/patterns', { params })
    return unwrapEnvelope<{ feedback_patterns: FeedbackPatternAlert[] }>(response.data)
  },

  getFeedbackAlerts: async (params?: {
    case_id?: string
    phase_context?: string
    linked_feature_or_agent?: string
    issue_tag?: string
  }) => {
    const response = await apiClient.get('/api/feedback/internal/alerts', { params })
    return unwrapEnvelope<{ feedback_alerts: FeedbackPatternAlert[] }>(response.data)
  },
}

export default caseService
