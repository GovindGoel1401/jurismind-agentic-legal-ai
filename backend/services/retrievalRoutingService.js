import { env } from '../config/envConfig.js'
import { fetchGraphKnowledgeBundle } from '../graph/graphQueries.js'
import { retrieveVectorDocuments, buildEmptyVectorResult } from '../rag/retriever.js'
import { runRetrievalRouterAgent } from '../agents/retrievalRouterAgent.js'
import { logger } from '../utils/logger.js'

function normalizeFlag(value) {
  return String(value || '')
    .trim()
    .toUpperCase() === 'YES'
    ? 'YES'
    : 'NO'
}

function dedupeDocuments(documents = []) {
  const seen = new Set()
  const output = []

  for (const doc of documents) {
    const key = `${doc?.id || 'unknown'}::${doc?.source || ''}`
    if (seen.has(key)) continue
    seen.add(key)
    output.push(doc)
  }

  return output
}

function trimText(value, maxChars = 420) {
  const text = String(value || '').trim()
  if (!text) return ''
  return text.length > maxChars ? `${text.slice(0, maxChars - 3)}...` : text
}

function buildTextBlock(label, documents = []) {
  if (!documents.length) return ''

  return documents
    .map((doc, index) => {
      const title = doc?.title || `${label} ${index + 1}`
      const score = typeof doc?.score === 'number' ? ` (score ${doc.score.toFixed(3)})` : ''
      const summary = trimText(doc?.summary || doc?.metadata?.text || 'No summary available.')
      return `${index + 1}. ${title}${score}\n${summary}`
    })
    .join('\n\n')
}

function buildRulesSummary(graphBundle = {}) {
  const laws = (graphBundle.relevant_laws || []).slice(0, 5)
  const sections = (graphBundle.relevant_sections || []).slice(0, 5)
  const relatedCases = (graphBundle.related_cases || []).slice(0, 5)

  if (!laws.length && !sections.length && !relatedCases.length) return ''

  return [
    laws.length ? `Relevant laws: ${laws.join(', ')}` : '',
    sections.length ? `Relevant sections: ${sections.join(', ')}` : '',
    relatedCases.length ? `Related cases: ${relatedCases.join(', ')}` : '',
  ]
    .filter(Boolean)
    .join('\n')
}

function deriveResearchTopic(state = {}) {
  return (
    state?.structuredCase?.possible_laws?.[0] ||
    state?.structuredCase?.case_type ||
    state?.caseInput?.category ||
    ''
  )
}

function buildHeuristicRouting(queryText, state = {}) {
  const text = String(queryText || '').trim()
  const evidenceSignals =
    Boolean(text) ||
    (state?.evidenceAnalysis?.missing_evidence || []).length > 0 ||
    (state?.evidenceAnalysis?.contradictions || []).length > 0
  const rulesSignals =
    /law|rule|procedure|admissib|objection|statute|section|policy|guideline/i.test(text) ||
    (state?.structuredCase?.possible_laws || []).length > 0 ||
    Boolean(state?.structuredCase?.case_type)

  return normalizeRetrievalRoutingDecision({
    evidence_required: evidenceSignals ? 'YES' : 'NO',
    rules_required: rulesSignals ? 'YES' : 'NO',
    no_retrieval: evidenceSignals || rulesSignals ? 'NO' : 'YES',
    reason: 'Heuristic routing fallback used because router output was unavailable.',
  })
}

export function normalizeRetrievalRoutingDecision(decision = {}) {
  const evidenceRequired = normalizeFlag(decision.evidence_required)
  const rulesRequired = normalizeFlag(decision.rules_required)
  const noRetrieval =
    evidenceRequired === 'YES' || rulesRequired === 'YES'
      ? 'NO'
      : 'YES'

  return {
    evidence_required: evidenceRequired,
    rules_required: rulesRequired,
    no_retrieval: noRetrieval,
    reason: String(decision.reason || 'Routing decision not provided.').trim(),
  }
}

export function resolveRetrievalMode(routing = {}) {
  const normalized = normalizeRetrievalRoutingDecision(routing)

  if (normalized.evidence_required === 'YES' && normalized.rules_required === 'YES') {
    return 'evidence_and_rules'
  }
  if (normalized.evidence_required === 'YES') return 'evidence_only'
  if (normalized.rules_required === 'YES') return 'rules_only'
  return 'none'
}

export async function routeRetrievalNeed({
  queryText = '',
  state = {},
  stage = 'debate_reasoning',
  recentTurns = [],
}) {
  try {
    const routed = await runRetrievalRouterAgent({
      queryText,
      stage,
      structuredCase: state?.structuredCase || {},
      evidenceAnalysis: state?.evidenceAnalysis || {},
      recentTurns,
    })

    const normalized = normalizeRetrievalRoutingDecision(routed)
    logger.info('[Retrieval Router] Decision computed.', {
      stage,
      routing: normalized,
      source: routed?.routerMeta?.source || 'unknown',
    })
    return normalized
  } catch (error) {
    const fallback = buildHeuristicRouting(queryText, state)
    logger.warn('[Retrieval Router] Failed, using heuristic routing.', {
      message: error?.message || String(error),
      routing: fallback,
    })
    return fallback
  }
}

export async function retrieveEvidenceContext({
  queryText = '',
  rewrittenQuery = '',
  vector = [],
  topK = 4,
}) {
  const effectiveQuery = String(rewrittenQuery || queryText || '').trim()
  const vectorResult = await retrieveVectorDocuments(effectiveQuery, topK, {
    vector,
    provider: 'faiss',
    indexName: env.FAISS_EVIDENCE_INDEX,
    mode: 'evidence',
    embeddingProvider: env.EMBEDDING_PROVIDER,
    embeddingModality: 'multimodal',
  })

  const selectedDocuments = dedupeDocuments(vectorResult.relevant_documents).slice(0, topK)

  return {
    documents: selectedDocuments,
    vectorResult: {
      ...vectorResult,
      relevant_documents: selectedDocuments,
    },
    text_block: buildTextBlock('Evidence', selectedDocuments),
    meta: {
      queryUsed: effectiveQuery,
      selectedChunkCount: selectedDocuments.length,
      namespace: vectorResult?.retrieval_meta?.namespace || '',
      provider: vectorResult?.retrieval_meta?.provider || '',
      collection: vectorResult?.retrieval_meta?.collection || '',
      retrievalAvailable: vectorResult?.retrieval_meta?.available ?? false,
    },
  }
}

export async function retrieveRulesContext({
  queryText = '',
  rewrittenQuery = '',
  state = {},
  vector = [],
  topK = 4,
  fetchGraphBundle = fetchGraphKnowledgeBundle,
}) {
  const topic = deriveResearchTopic(state)
  const effectiveQuery = String(rewrittenQuery || queryText || '').trim()
  const vectorQuery = [effectiveQuery, topic].filter(Boolean).join('\n')
  const vectorResult = await retrieveVectorDocuments(vectorQuery, topK, {
    vector,
    provider: 'qdrant',
    collection: env.QDRANT_RULES_COLLECTION,
    mode: 'rules',
    embeddingProvider: env.EMBEDDING_PROVIDER,
    embeddingModality: 'text',
  })
  const graphBundle = topic
    ? await fetchGraphBundle(topic)
    : {
        relevant_laws: [],
        relevant_sections: [],
        related_cases: [],
        graph_records: [],
      }

  const selectedDocuments = dedupeDocuments(vectorResult.relevant_documents).slice(0, topK)
  const rulesSummary = buildRulesSummary(graphBundle)
  const textBlockParts = [buildTextBlock('Rule', selectedDocuments), rulesSummary].filter(Boolean)

  return {
    documents: selectedDocuments,
    vectorResult: {
      ...vectorResult,
      relevant_documents: selectedDocuments,
    },
    graphBundle,
    text_block: textBlockParts.join('\n\n'),
    meta: {
      queryUsed: vectorQuery,
      selectedChunkCount: selectedDocuments.length,
      namespace: vectorResult?.retrieval_meta?.namespace || '',
      provider: vectorResult?.retrieval_meta?.provider || '',
      collection: vectorResult?.retrieval_meta?.collection || '',
      graphRecordCount: (graphBundle.graph_records || []).length,
      retrievalAvailable: vectorResult?.retrieval_meta?.available ?? false,
    },
  }
}

export async function getConditionalRetrievedContext({
  routing = {},
  queryText = '',
  state = {},
  vector = [],
  rewrittenQueries = {},
  dependencies = {},
}) {
  const normalizedRouting = normalizeRetrievalRoutingDecision(routing)
  const mode = resolveRetrievalMode(normalizedRouting)
  const retrieveEvidence = dependencies.retrieveEvidenceContext || retrieveEvidenceContext
  const retrieveRules = dependencies.retrieveRulesContext || retrieveRulesContext
  const evidenceQuery = rewrittenQueries?.evidenceQuery || queryText
  const rulesQuery = rewrittenQueries?.rulesQuery || queryText

  const evidenceContext =
    normalizedRouting.evidence_required === 'YES'
      ? await retrieveEvidence({
          queryText,
          rewrittenQuery: evidenceQuery,
          state,
          vector,
        })
      : {
          documents: [],
          vectorResult: buildEmptyVectorResult('not_requested', { mode: 'evidence' }),
          text_block: '',
          meta: {
            queryUsed: '',
            selectedChunkCount: 0,
            namespace: '',
            provider: 'faiss',
            collection: env.FAISS_EVIDENCE_INDEX,
            retrievalAvailable: false,
          },
        }

  const rulesContext =
    normalizedRouting.rules_required === 'YES'
      ? await retrieveRules({
          queryText,
          rewrittenQuery: rulesQuery,
          state,
          vector,
        })
      : {
          documents: [],
          vectorResult: buildEmptyVectorResult('not_requested', { mode: 'rules' }),
          graphBundle: {
            relevant_laws: [],
            relevant_sections: [],
            related_cases: [],
            graph_records: [],
          },
          text_block: '',
          meta: {
            queryUsed: '',
            selectedChunkCount: 0,
            namespace: '',
            provider: 'qdrant',
            collection: env.QDRANT_RULES_COLLECTION,
            graphRecordCount: 0,
            retrievalAvailable: false,
          },
        }

  const allDocuments = dedupeDocuments([
    ...evidenceContext.documents,
    ...rulesContext.documents,
  ])

  logger.info('[Retrieval Router] Conditional retrieval complete.', {
    mode,
    evidenceRetrieved: normalizedRouting.evidence_required === 'YES',
    rulesRetrieved: normalizedRouting.rules_required === 'YES',
    evidenceChunks: evidenceContext.meta.selectedChunkCount,
    rulesChunks: rulesContext.meta.selectedChunkCount,
  })

  return {
    mode,
    routing: normalizedRouting,
    evidence: evidenceContext,
    rules: rulesContext,
    relevant_documents: allDocuments,
    debug: {
      evidence_chunk_count: evidenceContext.meta.selectedChunkCount,
      rules_chunk_count: rulesContext.meta.selectedChunkCount,
      evidence_namespace: evidenceContext.meta.namespace || '',
      evidence_provider: evidenceContext.meta.provider || '',
      evidence_collection: evidenceContext.meta.collection || '',
      evidence_query_used: evidenceContext.meta.queryUsed || '',
      rules_namespace: rulesContext.meta.namespace || '',
      rules_provider: rulesContext.meta.provider || '',
      rules_collection: rulesContext.meta.collection || '',
      rules_query_used: rulesContext.meta.queryUsed || '',
      final_mode: mode,
    },
  }
}
