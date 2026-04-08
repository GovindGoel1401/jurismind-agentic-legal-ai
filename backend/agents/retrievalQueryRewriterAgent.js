import { retrievalQueryRewriteSchema } from './contracts/legalAgentSchemas.js'
import { buildRetrievalQueryRewritePrompt } from './prompts/retrievalQueryRewritePrompt.js'
import { createStructuredLegalAgent } from './shared/createStructuredLegalAgent.js'

function buildFallback(input = {}) {
  const query = String(input?.userQuery || '').trim()
  const category = String(input?.caseInput?.category || '').trim()
  const jurisdiction = String(input?.caseInput?.jurisdiction || '').trim()
  const laws = Array.isArray(input?.structuredCase?.possible_laws)
    ? input.structuredCase.possible_laws.filter(Boolean).slice(0, 4)
    : []
  const base = [query, category, jurisdiction, ...laws].filter(Boolean).join(' ').trim() || query || 'legal case query'

  return {
    retrieval_query: base,
    evidence_query: base,
    rules_query: [base, ...laws].filter(Boolean).join(' ').trim() || base,
    similar_cases_query: [base, category, 'similar cases precedent outcome'].filter(Boolean).join(' ').trim(),
    focus_points: laws.length ? laws : [category || 'general case issue'],
    filters: {
      category,
      jurisdiction,
      laws,
    },
  }
}

export const runRetrievalQueryRewriterAgent = createStructuredLegalAgent({
  agentName: 'Retrieval Query Rewriter',
  schema: retrievalQueryRewriteSchema,
  buildPrompt: buildRetrievalQueryRewritePrompt,
  buildFallback,
  transformValidated: (validated, input) => {
    const fallback = buildFallback(input)
    return {
      retrieval_query: validated.retrieval_query || fallback.retrieval_query,
      evidence_query: validated.evidence_query || validated.retrieval_query || fallback.evidence_query,
      rules_query: validated.rules_query || validated.retrieval_query || fallback.rules_query,
      similar_cases_query:
        validated.similar_cases_query || validated.retrieval_query || fallback.similar_cases_query,
      focus_points: Array.isArray(validated.focus_points) && validated.focus_points.length
        ? validated.focus_points
        : fallback.focus_points,
      filters: {
        category: validated.filters?.category || fallback.filters.category,
        jurisdiction: validated.filters?.jurisdiction || fallback.filters.jurisdiction,
        laws: Array.isArray(validated.filters?.laws) && validated.filters.laws.length
          ? validated.filters.laws
          : fallback.filters.laws,
      },
    }
  },
  buildResult: ({ data, meta }) => ({
    ...data,
    rewriteMeta: meta,
  }),
})
