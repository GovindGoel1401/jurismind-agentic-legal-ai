import { retrievalRouterSchema } from './contracts/legalAgentSchemas.js'
import { buildRetrievalRouterPrompt } from './prompts/retrievalRouterPrompt.js'
import { createStructuredLegalAgent } from './shared/createStructuredLegalAgent.js'

function normalizeFlag(value) {
  return String(value || '')
    .trim()
    .toUpperCase() === 'YES'
    ? 'YES'
    : 'NO'
}

function normalizeRouting(validated) {
  const evidenceRequired = normalizeFlag(validated.evidence_required)
  const rulesRequired = normalizeFlag(validated.rules_required)
  const noRetrieval =
    evidenceRequired === 'YES' || rulesRequired === 'YES'
      ? 'NO'
      : normalizeFlag(validated.no_retrieval) === 'YES'
        ? 'YES'
        : 'YES'

  return {
    evidence_required: evidenceRequired,
    rules_required: rulesRequired,
    no_retrieval: noRetrieval,
    reason: String(validated.reason || 'Routing decision unavailable.').trim(),
  }
}

function buildFallback(input = {}) {
  const queryText = String(input?.queryText || '').trim()
  const hasEvidenceSignals =
    Boolean(queryText) ||
    (input?.evidenceAnalysis?.missing_evidence || []).length > 0 ||
    (input?.evidenceAnalysis?.contradictions || []).length > 0
  const hasRuleSignals =
    (input?.structuredCase?.possible_laws || []).length > 0 ||
    Boolean(input?.structuredCase?.case_type) ||
    Boolean(input?.queryText && /law|rule|procedure|admissib|statute|section|objection/i.test(input.queryText))

  const fallback = {
    evidence_required: hasEvidenceSignals ? 'YES' : 'NO',
    rules_required: hasRuleSignals ? 'YES' : 'NO',
    no_retrieval: 'NO',
    reason: 'Fallback routing used to preserve existing retrieval behavior.',
  }

  return normalizeRouting(fallback)
}

export const runRetrievalRouterAgent = createStructuredLegalAgent({
  agentName: 'Retrieval Router',
  schema: retrievalRouterSchema,
  buildPrompt: buildRetrievalRouterPrompt,
  buildFallback: buildFallback,
  transformValidated: normalizeRouting,
  buildResult: ({ data, meta }) => ({
    ...data,
    routerMeta: meta,
  }),
})
