import { env } from '../config/envConfig.js'
import { logger } from '../utils/logger.js'

const chromaCollectionIdCache = new Map()
const CHROMA_LEXICAL_FALLBACK_LIMIT = 200

function normalizeText(value) {
  return String(value || '')
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

function lexicalOverlapScore(queryText, documentText) {
  const queryTokens = new Set(normalizeText(queryText).split(' ').filter(Boolean))
  const documentTokens = new Set(normalizeText(documentText).split(' ').filter(Boolean))
  if (!queryTokens.size || !documentTokens.size) return 0

  let overlap = 0
  for (const token of queryTokens) {
    if (documentTokens.has(token)) overlap += 1
  }
  return overlap / queryTokens.size
}

function getChromaBaseUrl() {
  if (env.CHROMA_URL) return env.CHROMA_URL.replace(/\/$/, '')
  if (env.CHROMA_HOST) return `https://${String(env.CHROMA_HOST).replace(/^https?:\/\//, '')}`
  return ''
}

function hasCloudConfig() {
  return Boolean(
    getChromaBaseUrl() &&
      env.CHROMA_API_KEY &&
      env.CHROMA_TENANT &&
      env.CHROMA_DATABASE,
  )
}

function buildChromaHeaders() {
  return {
    'Content-Type': 'application/json',
    ...(env.CHROMA_API_KEY ? { 'x-chroma-token': env.CHROMA_API_KEY } : {}),
  }
}

function getCloudCollectionsUrl() {
  if (!hasCloudConfig()) return ''
  return `${getChromaBaseUrl()}/api/v2/tenants/${env.CHROMA_TENANT}/databases/${env.CHROMA_DATABASE}/collections`
}

function getLegacyQueryUrl(collection = '') {
  if (env.CHROMA_QUERY_URL) return env.CHROMA_QUERY_URL
  if (!getChromaBaseUrl() || !collection) return ''
  return `${getChromaBaseUrl()}/api/v1/collections/${collection}/query`
}

function getLegacyAddUrl(collection = '') {
  if (env.CHROMA_ADD_URL) return env.CHROMA_ADD_URL
  if (!getChromaBaseUrl() || !collection) return ''
  return `${getChromaBaseUrl()}/api/v1/collections/${collection}/add`
}

function toChromaDocument(docText, metadata, distance, index) {
  const meta = metadata || {}
  const score = typeof distance === 'number' ? Math.max(0, Math.min(1, 1 - distance)) : 0

  return {
    id: meta.id || meta.case_id || meta.document_id || `chroma-doc-${index + 1}`,
    title: meta.title || meta.case_title || `Chroma document ${index + 1}`,
    summary: meta.summary || meta.text || String(docText || '').slice(0, 800) || 'No summary available.',
    source: meta.source || 'chroma',
    score,
    metadata: meta,
  }
}

async function fetchCloudChromaRecords(collectionId, limit = CHROMA_LEXICAL_FALLBACK_LIMIT) {
  const response = await fetch(
    `${getCloudCollectionsUrl()}/${collectionId}/get`,
    {
      method: 'POST',
      headers: buildChromaHeaders(),
      body: JSON.stringify({
        limit,
        offset: 0,
        include: ['documents', 'metadatas'],
      }),
    },
  )

  if (!response.ok) {
    throw new Error(`Chroma get failed with status ${response.status}`)
  }

  return response.json()
}

async function queryCloudChromaLexicalFallback({
  queryText = '',
  topK = 5,
  collection = env.CHROMA_SIMILAR_CASES_COLLECTION,
  collectionId = '',
}) {
  if (!collectionId) {
    return {
      documents: [],
      meta: {
        available: false,
        reason: 'chroma_collection_unavailable',
        provider: 'chroma',
        collection,
      },
    }
  }

  try {
    const payload = await fetchCloudChromaRecords(collectionId)
    const documents = Array.isArray(payload?.documents) ? payload.documents : []
    const metadatas = Array.isArray(payload?.metadatas) ? payload.metadatas : []
    const ids = Array.isArray(payload?.ids) ? payload.ids : []

    const scored = documents
      .map((docText, index) => {
        const metadata = metadatas[index] || {}
        const title = metadata?.title || metadata?.case_title || ''
        const score = lexicalOverlapScore(queryText, `${title} ${docText || metadata?.summary || ''}`)

        return {
          id: metadata?.id || metadata?.case_id || ids[index] || `chroma-doc-${index + 1}`,
          title: title || `Chroma document ${index + 1}`,
          summary:
            metadata?.summary ||
            metadata?.text ||
            String(docText || '').slice(0, 800) ||
            'No summary available.',
          source: metadata?.source || 'chroma',
          score,
          metadata,
        }
      })
      .filter((item) => item.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, topK)

    return {
      documents: scored,
      meta: {
        available: true,
        reason: 'ok_lexical_fallback',
        provider: 'chroma',
        collection,
      },
    }
  } catch (error) {
    logger.warn('Chroma lexical fallback failed.', {
      message: error?.message || String(error),
      collection,
    })
    return {
      documents: [],
      meta: {
        available: false,
        reason: 'chroma_lexical_fallback_failed',
        provider: 'chroma',
        collection,
      },
    }
  }
}

async function findCollectionIdByName(collection) {
  const collectionsUrl = getCloudCollectionsUrl()
  if (!collectionsUrl || !collection) return ''

  const response = await fetch(collectionsUrl, {
    method: 'GET',
    headers: buildChromaHeaders(),
  })

  if (!response.ok) {
    throw new Error(`Chroma collection lookup failed with status ${response.status}`)
  }

  const payload = await response.json()
  const collections = Array.isArray(payload)
    ? payload
    : Array.isArray(payload?.collections)
      ? payload.collections
      : []
  const matched = collections.find((item) => item?.name === collection)
  return matched?.id || ''
}

async function ensureCloudCollection(collection) {
  if (!collection || !hasCloudConfig()) return ''
  if (chromaCollectionIdCache.has(collection)) {
    return chromaCollectionIdCache.get(collection)
  }

  const collectionsUrl = getCloudCollectionsUrl()

  try {
    const createResponse = await fetch(collectionsUrl, {
      method: 'POST',
      headers: buildChromaHeaders(),
      body: JSON.stringify({
        name: collection,
        metadata: {
          source: 'jurismind-ai',
        },
      }),
    })

    if (createResponse.ok) {
      const payload = await createResponse.json()
      const collectionId = payload?.id || ''
      if (collectionId) {
        chromaCollectionIdCache.set(collection, collectionId)
        return collectionId
      }
    }

    const collectionId = await findCollectionIdByName(collection)
    if (collectionId) {
      chromaCollectionIdCache.set(collection, collectionId)
      return collectionId
    }

    throw new Error(
      `Chroma collection "${collection}" could not be created or resolved.`,
    )
  } catch (error) {
    logger.warn('Chroma collection resolution failed.', {
      message: error?.message || String(error),
      collection,
    })
    return ''
  }
}

async function queryCloudChromaDocuments({
  queryText = '',
  queryEmbedding = [],
  topK = 5,
  collection = env.CHROMA_SIMILAR_CASES_COLLECTION,
  filter = null,
}) {
  const collectionId = await ensureCloudCollection(collection)
  if (!collectionId) {
    return {
      documents: [],
      meta: {
        available: false,
        reason: 'chroma_collection_unavailable',
        provider: 'chroma',
        collection,
      },
    }
  }

  if ((!Array.isArray(queryEmbedding) || !queryEmbedding.length) && queryText) {
    return queryCloudChromaLexicalFallback({
      queryText,
      topK,
      collection,
      collectionId,
    })
  }

  try {
    const response = await fetch(
      `${getCloudCollectionsUrl()}/${collectionId}/query`,
      {
        method: 'POST',
        headers: buildChromaHeaders(),
        body: JSON.stringify({
          ...(Array.isArray(queryEmbedding) && queryEmbedding.length
            ? { query_embeddings: [queryEmbedding] }
            : { query_texts: [queryText] }),
          n_results: topK,
          include: ['documents', 'metadatas', 'distances'],
          ...(filter ? { where: filter } : {}),
        }),
      },
    )

    if (!response.ok) {
      const errorBody = await response.text().catch(() => '')
      if (
        response.status === 422 &&
        /query_embeddings/i.test(errorBody) &&
        queryText
      ) {
        logger.warn('Chroma query requires query embeddings. Using lexical fallback.', {
          collection,
        })
        return queryCloudChromaLexicalFallback({
          queryText,
          topK,
          collection,
          collectionId,
        })
      }

      throw new Error(
        `Chroma query failed with status ${response.status}${errorBody ? `: ${errorBody}` : ''}`,
      )
    }

    const payload = await response.json()
    const documents = payload?.documents?.[0] || []
    const metadatas = payload?.metadatas?.[0] || []
    const distances = payload?.distances?.[0] || []

    return {
      documents: documents.map((docText, index) =>
        toChromaDocument(docText, metadatas[index], distances[index], index),
      ),
      meta: {
        available: true,
        reason: 'ok',
        provider: 'chroma',
        collection,
      },
    }
  } catch (error) {
    logger.warn('Chroma retrieval failed. Returning empty results.', {
      message: error?.message || String(error),
      collection,
    })
    return {
      documents: [],
      meta: {
        available: false,
        reason: 'chroma_query_failed',
        provider: 'chroma',
        collection,
      },
    }
  }
}

async function addCloudChromaDocuments({
  collection = env.CHROMA_SIMILAR_CASES_COLLECTION,
  records = [],
}) {
  const collectionId = await ensureCloudCollection(collection)
  if (!collectionId) {
    return {
      success: false,
      reason: 'chroma_collection_unavailable',
      provider: 'chroma',
      collection,
      indexed_count: 0,
    }
  }

  try {
    const response = await fetch(
      `${getCloudCollectionsUrl()}/${collectionId}/add`,
      {
        method: 'POST',
        headers: buildChromaHeaders(),
        body: JSON.stringify({
          ids: records.map((item) => item.id),
          documents: records.map((item) => item.text),
          metadatas: records.map((item) => item.metadata || {}),
          embeddings: records.map((item) => item.vector),
        }),
      },
    )

    if (!response.ok) {
      throw new Error(`Chroma add failed with status ${response.status}`)
    }

    return {
      success: true,
      reason: 'ok',
      provider: 'chroma',
      collection,
      indexed_count: records.length,
    }
  } catch (error) {
    logger.warn('Chroma upsert failed.', {
      message: error?.message || String(error),
      collection,
    })
    return {
      success: false,
      reason: 'chroma_add_failed',
      provider: 'chroma',
      collection,
      indexed_count: 0,
    }
  }
}

export async function queryChromaDocuments({
  queryText = '',
  queryEmbedding = [],
  topK = 5,
  collection = env.CHROMA_JUDGMENTS_COLLECTION,
  filter = null,
}) {
  if (hasCloudConfig()) {
    return queryCloudChromaDocuments({
      queryText,
      queryEmbedding,
      topK,
      collection,
      filter,
    })
  }

  const queryUrl = getLegacyQueryUrl(collection)

  if (!queryUrl || !collection) {
    return {
      documents: [],
      meta: {
        available: false,
        reason: 'chroma_not_configured',
        provider: 'chroma',
        collection,
      },
    }
  }

  try {
    const response = await fetch(queryUrl, {
      method: 'POST',
      headers: buildChromaHeaders(),
      body: JSON.stringify({
        query_texts: [queryText],
        n_results: topK,
        include: ['documents', 'metadatas', 'distances'],
        ...(filter ? { where: filter } : {}),
      }),
    })

    if (!response.ok) {
      throw new Error(`Chroma query failed with status ${response.status}`)
    }

    const payload = await response.json()
    const documents = payload?.documents?.[0] || []
    const metadatas = payload?.metadatas?.[0] || []
    const distances = payload?.distances?.[0] || []

    return {
      documents: documents.map((docText, index) =>
        toChromaDocument(docText, metadatas[index], distances[index], index),
      ),
      meta: {
        available: true,
        reason: 'ok',
        provider: 'chroma',
        collection,
      },
    }
  } catch (error) {
    logger.warn('Chroma retrieval failed. Returning empty results.', {
      message: error?.message || String(error),
      collection,
    })
    return {
      documents: [],
      meta: {
        available: false,
        reason: 'chroma_query_failed',
        provider: 'chroma',
        collection,
      },
    }
  }
}

export async function upsertChromaDocuments({
  collection = env.CHROMA_JUDGMENTS_COLLECTION,
  records = [],
}) {
  if (!collection) {
    return {
      success: false,
      reason: 'chroma_not_configured',
      provider: 'chroma',
      collection,
      indexed_count: 0,
    }
  }

  if (!records.length) {
    return {
      success: true,
      reason: 'no_records',
      provider: 'chroma',
      collection,
      indexed_count: 0,
    }
  }

  if (hasCloudConfig()) {
    return addCloudChromaDocuments({
      collection,
      records,
    })
  }

  const addUrl = getLegacyAddUrl(collection)
  if (!addUrl) {
    return {
      success: false,
      reason: 'chroma_not_configured',
      provider: 'chroma',
      collection,
      indexed_count: 0,
    }
  }

  try {
    const response = await fetch(addUrl, {
      method: 'POST',
      headers: buildChromaHeaders(),
      body: JSON.stringify({
        ids: records.map((item) => item.id),
        documents: records.map((item) => item.text),
        metadatas: records.map((item) => item.metadata || {}),
        embeddings: records.map((item) => item.vector).filter(Array.isArray).length === records.length
          ? records.map((item) => item.vector)
          : undefined,
      }),
    })

    if (!response.ok) {
      throw new Error(`Chroma add failed with status ${response.status}`)
    }

    return {
      success: true,
      reason: 'ok',
      provider: 'chroma',
      collection,
      indexed_count: records.length,
    }
  } catch (error) {
    logger.warn('Chroma upsert failed.', {
      message: error?.message || String(error),
      collection,
    })
    return {
      success: false,
      reason: 'chroma_add_failed',
      provider: 'chroma',
      collection,
      indexed_count: 0,
    }
  }
}
