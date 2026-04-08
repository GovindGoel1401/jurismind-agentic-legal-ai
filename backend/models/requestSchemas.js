import { z } from 'zod'

export const analyzeCaseSchema = z
  .object({
    caseText: z.string().min(20).optional(),
    description: z.string().min(20).optional(),
    category: z.string().optional(),
    jurisdiction: z.string().optional(),
    evidence: z
      .array(
        z.object({
          name: z.string().min(1),
          size: z.coerce.number().min(0).optional().default(0),
          type: z.string().optional().default('application/octet-stream'),
        }),
      )
      .optional()
      .default([]),
  })
  .refine((data) => Boolean(data.caseText || data.description), {
    message: 'Provide caseText or description with at least 20 characters.',
  })

export const documentIntelligenceSchema = analyzeCaseSchema

export const feedbackSchema = z.object({
  case_id: z.string().min(1).default('latest-analysis'),
  session_id: z.string().optional().default(''),
  phase_context: z.string().optional().default('general'),
  satisfaction_status: z.enum(['yes', 'no', 'unknown']).optional().default('unknown'),
  feedback_type: z.enum([
    'advice_usefulness',
    'answer_correctness_concern',
    'updated_case_fact',
    'missing_context_provided_later',
    'actual_case_outcome',
    'user_comment',
  ]),
  linked_feature_or_agent: z.string().optional().default(''),
  linked_output_reference: z.string().optional().default(''),
  user_rating: z.coerce.number().int().min(1).max(5).optional(),
  verdict_helpful: z.boolean().optional(),
  analysis_helpful: z.boolean().optional(),
  debate_helpful: z.boolean().optional(),
  document_guidance_helpful: z.boolean().optional(),
  similar_cases_helpful: z.boolean().optional(),
  issue_tags: z.array(z.string()).optional().default([]),
  comment: z.string().max(4000).optional().default(''),
  case_signature: z
    .object({
      case_type: z.string().optional().default(''),
      jurisdiction: z.string().optional().default(''),
      evidence_level: z.string().optional().default(''),
      doc_completeness: z.coerce.number().min(0).max(1).optional(),
      evidence_band: z.string().optional().default(''),
    })
    .optional()
    .default({}),
  payload: z.record(z.any()).optional().default({}),
  tags: z.array(z.string()).optional().default([]),
  metadata: z
    .object({
      case_input: z.record(z.any()).optional().default({}),
      ai_verdict: z.record(z.any()).optional().default({}),
      recommendation_snapshot: z.any().optional(),
      debate_session_snapshot: z.any().optional(),
      actual_outcome: z.any().optional(),
    })
    .optional()
    .default({ case_input: {}, ai_verdict: {} }),
})

export const feedbackInsightsSchema = z.object({
  case_input: z.record(z.any()).optional().default({}),
  filters: z
    .object({
      case_id: z.string().optional(),
      session_id: z.string().optional(),
      feedback_type: z.string().optional(),
      phase_context: z.string().optional(),
      linked_feature_or_agent: z.string().optional(),
      tags: z.array(z.string()).optional(),
      issue_tags: z.array(z.string()).optional(),
    })
    .optional()
    .default({}),
})

export const similarCasesSchema = z.object({
  query: z.string().min(10).max(2000),
  topK: z.coerce.number().int().min(1).max(10).optional().default(5),
  category: z.string().optional().default(''),
  jurisdiction: z.string().optional().default(''),
  document_intelligence: z.record(z.any()).optional().default({}),
  case_assessment: z.record(z.any()).optional().default({}),
})

export const knowledgeGraphQuerySchema = z.object({
  case_id: z.string().optional().default(''),
  issue: z.string().optional().default(''),
  outcome: z.string().optional().default(''),
  legal_rule: z.string().optional().default(''),
  side: z.enum(['', 'supporting', 'opposing']).optional().default(''),
  limit: z.coerce.number().int().min(1).max(10).optional().default(5),
})

export const knowledgeGraphPatternQuerySchema = z.object({
  case_id: z.string().optional().default(''),
  query_type: z.enum([
    'case_surface',
    'unsupported_claims',
    'contradictions',
    'human_factors',
    'missing_evidence_clusters',
    'unresolved_issues',
    'structural_similar_cases',
    'strategy_actions',
  ]),
  risk_type: z.string().optional().default(''),
  min_count: z.coerce.number().int().min(1).max(20).optional().default(2),
  limit: z.coerce.number().int().min(1).max(25).optional().default(10),
})

export const knowledgeGraphRebuildSchema = z.object({
  case_id: z.string().optional().default(''),
  limit: z.coerce.number().int().min(1).max(200).optional().default(25),
  stop_on_error: z.coerce.boolean().optional().default(false),
})

export const debateSimulationSessionSchema = z.object({
  case_input: z.record(z.any()),
  analysis: z.record(z.any()).optional().default({}),
  verdict: z.record(z.any()).optional().default({}),
  similar_case_intelligence: z.record(z.any()).optional().default({}),
  session_memory: z.record(z.any()).nullable().optional().default(null),
})

export const debateSimulationApplyAnswerSchema = z.object({
  question_id: z.string().min(1),
  selected_answer_option_id: z.string().optional().default(''),
  custom_answer: z.string().max(4000).optional().default(''),
  session_memory: z.record(z.any()),
})
