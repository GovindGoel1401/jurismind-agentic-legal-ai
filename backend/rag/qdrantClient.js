import { env } from '../config/envConfig.js'
import { logger } from '../utils/logger.js'
import crypto from 'node:crypto'

const QDRANT_LEXICAL_FALLBACK_LIMIT = 200

function buildQdrantHeaders() {
  return {
    'Content-Type': 'application/json',
    ...(env.QDRANT_API_KEY ? { 'api-key': env.QDRANT_API_KEY } : {}),
  }
}

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

function buildPointDocument(point, index) {
  const payload = point?.payload || {}
  return {
    id: String(point?.id || payload.id || `qdrant-doc-${index + 1}`),
    title: payload.title || payload.case_title || `Qdrant document ${index + 1}`,
    summary: payload.summary || payload.text || 'No summary available.',
    source: payload.source || 'qdrant',
    score: Number(point?.score || 0),
    metadata: payload,
  }
}

function chunkRecords(records = [], batchSize = 64) {
  const chunks = []
  for (let index = 0; index < records.length; index += batchSize) {
    chunks.push(records.slice(index, index + batchSize))
  }
  return chunks
}

function toQdrantPointId(value, fallback) {
  const raw = String(value || fallback || '').trim()
  if (/^\d+$/.test(raw)) return Number(raw)
  if (/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(raw)) {
    return raw
  }

  const hex = crypto.createHash('sha1').update(raw || String(fallback || '')).digest('hex').slice(0, 32)
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-4${hex.slice(13, 16)}-a${hex.slice(17, 20)}-${hex.slice(20, 32)}`
}

async function ensureQdrantCollection(collection, vectorSize) {
  if (!env.QDRANT_URL || !collection || !Number(vectorSize)) return false

  const baseUrl = env.QDRANT_URL.replace(/\/$/, '')

  try {
    const existing = await fetch(`${baseUrl}/collections/${collection}`, {
      method: 'GET',
      headers: buildQdrantHeaders(),
    })

    if (existing.ok) return true

    const create = await fetch(`${baseUrl}/collections/${collection}`, {
      method: 'PUT',
      headers: buildQdrantHeaders(),
      body: JSON.stringify({
        vectors: {
          size: vectorSize,
          distance: 'Cosine',
        },
      }),
    })

    if (!create.ok) {
      throw new Error(`Qdrant collection create failed with status ${create.status}`)
    }

    logger.info('Qdrant collection ensured.', {
      collection,
      vectorSize,
    })
    return true
  } catch (error) {
    logger.warn('Qdrant collection ensure failed.', {
      message: error?.message || String(error),
      collection,
      vectorSize,
    })
    return false
  }
}

export async function queryQdrantDocuments({
  queryVector = [],
  topK = 5,
  collection,
  filter = null,
  queryText = '',
}) {
  if (!env.QDRANT_URL || !collection) {
    return {
      documents: [],
      meta: {
        available: false,
        reason: 'qdrant_not_configured',
        provider: 'qdrant',
        collection,
      },
    }
  }

  if ((!Array.isArray(queryVector) || !queryVector.length) && queryText) {
    try {
      const response = await fetch(
        `${env.QDRANT_URL.replace(/\/$/, '')}/collections/${collection}/points/scroll`,
        {
          method: 'POST',
          headers: buildQdrantHeaders(),
          body: JSON.stringify({
            limit: QDRANT_LEXICAL_FALLBACK_LIMIT,
            with_payload: true,
            ...(filter ? { filter } : {}),
          }),
        },
      )

      if (!response.ok) {
        throw new Error(`Qdrant scroll failed with status ${response.status}`)
      }

      const payload = await response.json()
      const points = Array.isArray(payload?.result?.points) ? payload.result.points : []
      const documents = points
        .map((point, index) => {
          const document = buildPointDocument(point, index)
          const score = lexicalOverlapScore(
            queryText,
            `${document.title || ''} ${document.summary || ''}`,
          )
          return {
            ...document,
            score,
          }
        })
        .filter((document) => document.score > 0)
        .sort((a, b) => b.score - a.score)
        .slice(0, topK)

      return {
        documents,
        meta: {
          available: true,
          reason: 'ok_lexical_fallback',
          provider: 'qdrant',
          collection,
        },
      }
    } catch (error) {
      logger.warn('Qdrant lexical fallback failed. Returning empty results.', {
        message: error?.message || String(error),
        collection,
      })
      return {
        documents: [],
        meta: {
          available: false,
          reason: 'qdrant_lexical_fallback_failed',
          provider: 'qdrant',
          collection,
        },
      }
    }
  }

  try {
    const response = await fetch(
      `${env.QDRANT_URL.replace(/\/$/, '')}/collections/${collection}/points/search`,
      {
        method: 'POST',
        headers: buildQdrantHeaders(),
        body: JSON.stringify({
          vector: queryVector,
          limit: topK,
          with_payload: true,
          ...(filter ? { filter } : {}),
        }),
      },
    )

    if (!response.ok) {
      throw new Error(`Qdrant query failed with status ${response.status}`)
    }

    const payload = await response.json()
    const points = payload?.result || []

    return {
      documents: points.map((point, index) => buildPointDocument(point, index)),
      meta: {
        available: true,
        reason: 'ok',
        provider: 'qdrant',
        collection,
      },
    }
  } catch (error) {
    logger.warn('Qdrant retrieval failed. Returning empty results.', {
      message: error?.message || String(error),
      collection,
    })
    return {
      documents: [],
      meta: {
        available: false,
        reason: 'qdrant_query_failed',
        provider: 'qdrant',
        collection,
      },
    }
  }
}

export async function upsertQdrantDocuments({
  collection,
  records = [],
}) {
  if (!env.QDRANT_URL || !collection) {
    return {
      success: false,
      reason: 'qdrant_not_configured',
      provider: 'qdrant',
      collection,
      indexed_count: 0,
    }
  }

  if (!records.length) {
    return {
      success: true,
      reason: 'no_records',
      provider: 'qdrant',
      collection,
      indexed_count: 0,
    }
  }

  try {
    const vectorSize = Array.isArray(records[0]?.vector) ? records[0].vector.length : 0
    const collectionReady = await ensureQdrantCollection(collection, vectorSize)
    if (!collectionReady) {
      return {
        success: false,
        reason: 'qdrant_collection_unavailable',
        provider: 'qdrant',
        collection,
        indexed_count: 0,
      }
    }

    let indexedCount = 0
    for (const batch of chunkRecords(records, 48)) {
      const response = await fetch(
        `${env.QDRANT_URL.replace(/\/$/, '')}/collections/${collection}/points?wait=true`,
        {
          method: 'PUT',
          headers: buildQdrantHeaders(),
          body: JSON.stringify({
            points: batch.map((record, index) => ({
              id: toQdrantPointId(record.id, `${collection}-${indexedCount + index + 1}`),
              vector: record.vector,
              payload: {
                original_id: record.id || `${collection}-${indexedCount + index + 1}`,
                ...(record.metadata || {}),
              },
            })),
          }),
        },
      )

      if (!response.ok) {
        const errorBody = await response.text().catch(() => '')
        throw new Error(
          `Qdrant upsert failed with status ${response.status}${errorBody ? `: ${errorBody}` : ''}`,
        )
      }

      indexedCount += batch.length
    }

    return {
      success: true,
      reason: 'ok',
      provider: 'qdrant',
      collection,
      indexed_count: indexedCount,
    }
  } catch (error) {
    logger.warn('Qdrant upsert failed.', {
      message: error?.message || String(error),
      collection,
    })
    return {
      success: false,
      reason: 'qdrant_upsert_failed',
      provider: 'qdrant',
      collection,
      indexed_count: 0,
    }
  }
}
