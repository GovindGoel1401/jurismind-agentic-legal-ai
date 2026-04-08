import { z } from 'zod'

const stringArray = () => z.array(z.string().trim().min(1))

export const caseInterpreterSchema = z.object({
  case_type: z.string().trim().min(1),
  jurisdiction: z.string().trim().min(1),
  entities: stringArray().default([]),
  claims: stringArray().default([]),
  possible_laws: stringArray().default([]),
})

export const evidenceAnalyzerSchema = z.object({
  evidence_score: z.coerce.number(),
  missing_evidence: stringArray().default([]),
  contradictions: stringArray().default([]),
})

export const defenseAgentSchema = z.object({
  defense_arguments: stringArray().min(1),
})

export const prosecutionAgentSchema = z.object({
  prosecution_arguments: stringArray().min(1),
})

export const debateRebuttalSchema = z.object({
  rebuttal_points: stringArray().min(1),
  debate_balance_score: z.coerce.number(),
})

export const retrievalRouterSchema = z.object({
  evidence_required: z.enum(['YES', 'NO']).default('NO'),
  rules_required: z.enum(['YES', 'NO']).default('NO'),
  no_retrieval: z.enum(['YES', 'NO']).default('YES'),
  reason: z.string().trim().min(1).default('No reason provided.'),
})

export const retrievalQueryRewriteSchema = z.object({
  retrieval_query: z.string().trim().min(1).default(''),
  evidence_query: z.string().trim().default(''),
  rules_query: z.string().trim().default(''),
  similar_cases_query: z.string().trim().default(''),
  focus_points: stringArray().default([]),
  filters: z
    .object({
      category: z.string().trim().default(''),
      jurisdiction: z.string().trim().default(''),
      laws: stringArray().default([]),
    })
    .default({
      category: '',
      jurisdiction: '',
      laws: [],
    }),
})

const debateQuestionItemSchema = z.object({
  question: z.string().trim().min(1),
  why_this_question_matters: z.string().trim().min(1).default('This question can materially affect the outcome analysis.'),
  linked_issue_or_evidence: z.string().trim().default('Current case issue'),
  issue_type: z.string().trim().default('general'),
  issue_reference: z.string().trim().default('Current case issue'),
  impact_axis: z.string().trim().default('credibility'),
  suggested_answer: z.string().trim().min(1).default('Provide a precise answer tied to facts, documents, and chronology.'),
  answer_reasoning: z.string().trim().min(1).default('The suggested answer is designed to be specific, credible, and supportable.'),
  risk_note: z.string().trim().default('Avoid unsupported statements or claims that contradict the case record.'),
})

export const debateQuestionGenerationSchema = z.object({
  defense_questions: z.array(debateQuestionItemSchema).min(1).max(6).default([]),
  prosecution_questions: z.array(debateQuestionItemSchema).min(1).max(6).default([]),
  session_strategy_note: z.string().trim().default('Focus on the latest answer while preserving continuity with the case record.'),
})

export const feedbackMemoryExtractionSchema = z.object({
  lesson_summary: z.string().trim().min(1).default('User feedback highlighted a refinement opportunity.'),
  lesson_category: z.string().trim().min(1).default('general_feedback'),
  missing_factor: z.string().trim().default(''),
  actual_outcome: z.string().trim().default(''),
  trust_score: z.coerce.number().min(0).max(1).default(0.55),
  should_store: z.enum(['YES', 'NO']).default('YES'),
  validation_status: z.enum(['pending', 'reviewed', 'validated']).default('pending'),
})

export const judgeAgentSchema = z.object({
  reasoning: z.string().trim().min(1),
  win_probability_user: z.coerce.number(),
  win_probability_opponent: z.coerce.number(),
  settlement_probability: z.coerce.number(),
})

export const reflectionAgentSchema = z.object({
  issues_found: stringArray().default([]),
  reasoning_flaws: stringArray().default([]),
  improvement_suggestions: stringArray().default([]),
  revised_confidence: z.coerce.number(),
})

export const knowledgeGraphExtractionSchema = z.object({
  case_summary: z.string().trim().min(1).default('Case summary unavailable.'),
  issues: z
    .array(
      z.object({
        issue_id: z.string().trim().min(1),
        title: z.string().trim().min(1),
        summary: z.string().trim().min(1).default('Issue summary unavailable.'),
        legal_rules: stringArray().default([]),
      }),
    )
    .default([]),
  arguments: z
    .array(
      z.object({
        argument_id: z.string().trim().min(1),
        side: z.enum(['supporting', 'opposing']).default('supporting'),
        title: z.string().trim().min(1),
        summary: z.string().trim().min(1).default('Argument summary unavailable.'),
        linked_issues: stringArray().default([]),
        evidence_labels: stringArray().default([]),
        legal_rules: stringArray().default([]),
        contradicts: stringArray().default([]),
      }),
    )
    .default([]),
  evidence_items: z
    .array(
      z.object({
        evidence_id: z.string().trim().min(1),
        label: z.string().trim().min(1),
        evidence_type: z.string().trim().min(1).default('document'),
        summary: z.string().trim().min(1).default('Evidence summary unavailable.'),
        supports_arguments: stringArray().default([]),
      }),
    )
    .default([]),
  legal_rules: z
    .array(
      z.object({
        rule_id: z.string().trim().min(1),
        label: z.string().trim().min(1),
        source: z.string().trim().min(1).default('legal-topic'),
        linked_issues: stringArray().default([]),
      }),
    )
    .default([]),
  reasoning_nodes: z
    .array(
      z.object({
        reasoning_id: z.string().trim().min(1),
        title: z.string().trim().min(1),
        summary: z.string().trim().min(1),
        linked_issues: stringArray().default([]),
        linked_rules: stringArray().default([]),
      }),
    )
    .default([]),
  outcome: z.object({
    outcome_id: z.string().trim().min(1).default('outcome-1'),
    label: z.string().trim().min(1).default('Outcome uncertain'),
    summary: z.string().trim().min(1).default('Outcome summary unavailable.'),
  }),
})
