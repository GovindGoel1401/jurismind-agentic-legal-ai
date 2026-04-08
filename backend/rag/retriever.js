import { embedCaseText } from './embeddingService.js'
import { getPineconeIndex } from './pineconeClient.js'
import { queryChromaDocuments } from './chromaClient.js'
import { queryFaissDocuments } from './faissClient.js'
import { queryQdrantDocuments } from './qdrantClient.js'
import { env } from '../config/envConfig.js'
import { logger } from '../utils/logger.js'

export const RETRIEVAL_PROVIDERS = {
  PINECONE: 'pinecone',
  CHROMA: 'chroma',
  FAISS: 'faiss',
  QDRANT: 'qdrant',
}

function normalizeText(value) {
  return String(value || '')
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

function lexicalOverlapScore(query, docText) {
  const queryTokens = new Set(normalizeText(query).split(' ').filter(Boolean))
  const docTokens = new Set(normalizeText(docText).split(' ').filter(Boolean))
  if (!queryTokens.size || !docTokens.size) return 0

  let overlap = 0
  for (const token of queryTokens) {
    if (docTokens.has(token)) overlap += 1
  }
  return overlap / queryTokens.size
}

function toRelevantDocument(match) {
  const metadata = match?.metadata || {}
  const title = metadata.title || metadata.case_title || 'Untitled legal document'
  const summary =
    metadata.summary ||
    metadata.fact_summary ||
    metadata.text ||
    'No summary available for this retrieved document.'
  const source = metadata.source || 'pinecone'

  return {
    id: match?.id || metadata.id || 'unknown-doc',
    title,
    summary,
    source,
    score: Number(match?.score || 0),
    metadata,
  }
}

export function buildEmptyVectorResult(reason = 'not_requested', extra = {}) {
  return {
    relevant_documents: [],
    crag: {
      relevance_score: 0,
      needs_correction: reason !== 'ok',
    },
    retrieval_meta: {
      available: false,
      reason,
      namespace: extra.namespace || '',
      provider: extra.provider || '',
      collection: extra.collection || '',
      mode: extra.mode || 'default',
    },
  }
}

export function evaluateCragRelevance(queryText, relevantDocuments) {
  if (!Array.isArray(relevantDocuments) || relevantDocuments.length === 0) {
    return {
      relevance_score: 0,
      needs_correction: true,
    }
  }

  const scored = relevantDocuments.map((doc) => {
    const providerScore = Number(doc.score || 0)
    const lexicalScore = lexicalOverlapScore(
      queryText,
      `${doc.title || ''} ${doc.summary || ''}`,
    )
    const blended = Math.max(0, Math.min(1, 0.7 * providerScore + 0.3 * lexicalScore))
    return blended
  })

  const avg = scored.reduce((sum, value) => sum + value, 0) / scored.length
  const relevance_score = Number(avg.toFixed(3))
  return {
    relevance_score,
    needs_correction: relevance_score < 0.6,
  }
}

export function resolveRetrievalProvider(mode = 'default', explicitProvider = '') {
  if (explicitProvider) return explicitProvider
  if (mode === 'judgments' || mode === 'similar_cases') {
    return env.CHROMA_API_KEY || env.CHROMA_URL || env.CHROMA_HOST
      ? RETRIEVAL_PROVIDERS.CHROMA
      : RETRIEVAL_PROVIDERS.QDRANT
  }
  if (mode === 'evidence' || mode === 'debate') return RETRIEVAL_PROVIDERS.FAISS
  if (mode === 'rules') return RETRIEVAL_PROVIDERS.QDRANT
  return env.VECTOR_DB_PROVIDER || RETRIEVAL_PROVIDERS.QDRANT
}

async function retrieveFromPinecone(queryText, topK = 5, options = {}) {
  const index = await getPineconeIndex()
  const namespace = String(options.namespace ?? env.PINECONE_NAMESPACE ?? '').trim()
  const filter = options.filter
  const providedVector = options.vector

  if (!index) {
    return buildEmptyVectorResult('pinecone_not_configured', {
      namespace,
      provider: RETRIEVAL_PROVIDERS.PINECONE,
      mode: options.mode,
    })
  }

  const vector =
    Array.isArray(providedVector) && providedVector.length > 0
      ? providedVector
      : await embedCaseText(queryText)
  if (!Array.isArray(vector) || vector.length === 0) {
    logger.warn('Embedding unavailable. Skipping Pinecone query.')
    return buildEmptyVectorResult('embedding_unavailable', {
      namespace,
      provider: RETRIEVAL_PROVIDERS.PINECONE,
      mode: options.mode,
    })
  }

  try {
    const scopedIndex = namespace ? index.namespace(namespace) : index
    const queryResult = await scopedIndex.query({
      vector,
      topK,
      includeMetadata: true,
      ...(filter ? { filter } : {}),
    })

    const relevant_documents = (queryResult.matches || []).map((match) =>
      toRelevantDocument(match),
    )

    return {
      relevant_documents,
      crag: evaluateCragRelevance(queryText, relevant_documents),
      retrieval_meta: {
        available: true,
        reason: 'ok',
        namespace,
        provider: RETRIEVAL_PROVIDERS.PINECONE,
        collection: '',
        mode: options.mode || 'default',
      },
    }
  } catch (error) {
    logger.warn('Pinecone retrieval failed. Returning empty vector results.', error?.message)
    return buildEmptyVectorResult('pinecone_query_failed', {
      namespace,
      provider: RETRIEVAL_PROVIDERS.PINECONE,
      mode: options.mode,
    })
  }
}

async function retrieveFromChroma(queryText, topK = 5, options = {}) {
  const collection =
    options.collection ||
    (options.mode === 'similar_cases'
      ? env.CHROMA_SIMILAR_CASES_COLLECTION
      : env.CHROMA_JUDGMENTS_COLLECTION) ||
    env.CHROMA_COLLECTION ||
    ''
  const providedVector = options.vector
  const queryEmbedding =
    Array.isArray(providedVector) && providedVector.length > 0
      ? providedVector
      : await embedCaseText(queryText, {
          provider: options.embeddingProvider || env.EMBEDDING_PROVIDER,
          modality: options.embeddingModality || 'text',
        })
  const result = await queryChromaDocuments({
    queryText,
    queryEmbedding,
    topK,
    collection,
    filter: options.filter || null,
  })

  return {
    relevant_documents: result.documents,
    crag: evaluateCragRelevance(queryText, result.documents),
    retrieval_meta: {
      available: result.meta.available,
      reason: result.meta.reason,
      namespace: '',
      provider: RETRIEVAL_PROVIDERS.CHROMA,
      collection,
      mode: options.mode || 'default',
    },
  }
}

async function retrieveFromFaiss(queryText, topK = 5, options = {}) {
  const providedVector = options.vector
  const vector =
    Array.isArray(providedVector) && providedVector.length > 0
      ? providedVector
      : []
  const result = await queryFaissDocuments({
    queryText,
    topK,
    vector,
    indexName: options.indexName || env.FAISS_EVIDENCE_INDEX,
    filter: options.filter || null,
  })

  return {
    relevant_documents: result.documents,
    crag: evaluateCragRelevance(queryText, result.documents),
    retrieval_meta: {
      available: result.meta.available,
      reason: result.meta.reason,
      namespace: '',
      provider: RETRIEVAL_PROVIDERS.FAISS,
      collection: result.meta.index || '',
      mode: options.mode || 'default',
    },
  }
}

async function retrieveFromQdrant(queryText, topK = 5, options = {}) {
  const providedVector = options.vector
  const vector =
    Array.isArray(providedVector) && providedVector.length > 0
      ? providedVector
      : await embedCaseText(queryText, {
          provider: options.embeddingProvider || env.EMBEDDING_PROVIDER,
          modality: options.embeddingModality || 'text',
        })

  if (!Array.isArray(vector) || vector.length === 0) {
    return buildEmptyVectorResult('embedding_unavailable', {
      provider: RETRIEVAL_PROVIDERS.QDRANT,
      collection: options.collection,
      mode: options.mode,
    })
  }

  const collection =
    options.collection ||
    (options.mode === 'rules'
      ? env.QDRANT_RULES_COLLECTION
      : env.QDRANT_SIMILAR_CASES_COLLECTION)
  const result = await queryQdrantDocuments({
    queryText,
    queryVector: vector,
    topK,
    collection,
    filter: options.filter || null,
  })

  return {
    relevant_documents: result.documents,
    crag: evaluateCragRelevance(queryText, result.documents),
    retrieval_meta: {
      available: result.meta.available,
      reason: result.meta.reason,
      namespace: '',
      provider: RETRIEVAL_PROVIDERS.QDRANT,
      collection,
      mode: options.mode || 'default',
    },
  }
}

async function retrieveFromFaissDebate(queryText, topK = 5, options = {}) {
  const providedVector = options.vector
  const vector =
    Array.isArray(providedVector) && providedVector.length > 0
      ? providedVector
      : await embedCaseText(queryText, {
          provider: options.embeddingProvider || env.EMBEDDING_PROVIDER,
          modality: options.embeddingModality || 'multimodal',
        })

  if (!Array.isArray(vector) || vector.length === 0) {
    return buildEmptyVectorResult('embedding_unavailable', {
      provider: RETRIEVAL_PROVIDERS.FAISS,
      collection: options.indexName,
      mode: options.mode,
    })
  }

  const indexName =
    options.indexName || env.FAISS_EVIDENCE_INDEX
  const result = await queryFaissDocuments({
    vector,
    queryText,
    topK,
    indexName,
    filter: options.filter || null,
  })

  return {
    relevant_documents: result.documents,
    crag: evaluateCragRelevance(queryText, result.documents),
    retrieval_meta: {
      available: result.meta.available,
      reason: result.meta.reason,
      namespace: '',
      provider: RETRIEVAL_PROVIDERS.FAISS,
      collection: indexName,
      mode: options.mode || 'default',
    },
  }
}

export async function retrieveVectorDocuments(queryText, topK = 5, options = {}) {
  const provider = resolveRetrievalProvider(options.mode, options.provider)

  if (provider === RETRIEVAL_PROVIDERS.QDRANT) {
    return retrieveFromQdrant(queryText, topK, options)
  }

  if (provider === RETRIEVAL_PROVIDERS.CHROMA) {
    return retrieveFromChroma(queryText, topK, options)
  }

  if (provider === RETRIEVAL_PROVIDERS.FAISS) {
    return retrieveFromFaissDebate(queryText, topK, options)
  }

  return retrieveFromPinecone(queryText, topK, options)
}

export async function retrieveSimilarCases(queryText, topK = 5, options = {}) {
  const { relevant_documents, retrieval_meta } = await retrieveVectorDocuments(queryText, topK, {
    ...options,
    mode: options.mode || 'similar_cases',
    provider: options.provider || resolveRetrievalProvider('similar_cases', options.provider),
    collection:
      options.collection ||
      (resolveRetrievalProvider('similar_cases', options.provider) === RETRIEVAL_PROVIDERS.CHROMA
        ? env.CHROMA_SIMILAR_CASES_COLLECTION
        : env.QDRANT_SIMILAR_CASES_COLLECTION),
  })

  return relevant_documents.map((doc) => ({
    caseId: doc.id,
    title: doc.title,
    summary: doc.summary,
    score: doc.score,
    category: doc.metadata?.case_category || doc.metadata?.category || '',
    jurisdiction: doc.metadata?.jurisdiction || '',
    retrieval_provider: retrieval_meta.provider,
    retrieval_collection: retrieval_meta.collection || '',
    ...doc.metadata,
  }))
}
