import fs from 'node:fs'
import path from 'node:path'

import { env } from '../config/envConfig.js'
import { logger } from '../utils/logger.js'

let faissModulePromise = null

function shouldPreferFaissService() {
  return Boolean(env.FAISS_API_URL)
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

function getFaissQueryUrl() {
  if (!env.FAISS_API_URL) return ''
  return `${env.FAISS_API_URL.replace(/\/$/, '')}${env.FAISS_QUERY_PATH || '/query'}`
}

function getFaissUpsertUrl() {
  if (!env.FAISS_API_URL) return ''
  return `${env.FAISS_API_URL.replace(/\/$/, '')}${env.FAISS_UPSERT_PATH || '/upsert'}`
}

function getIndexRootDir() {
  return env.FAISS_NODE_INDEX_DIR
    ? path.resolve(env.FAISS_NODE_INDEX_DIR)
    : path.resolve(process.cwd(), 'data', 'faiss')
}

function getIndexPaths(indexName) {
  const rootDir = getIndexRootDir()
  return {
    rootDir,
    indexPath: path.join(rootDir, `${indexName}.index`),
    metadataPath: path.join(rootDir, `${indexName}.metadata.json`),
  }
}

function ensureIndexDir() {
  fs.mkdirSync(getIndexRootDir(), { recursive: true })
}

async function loadFaissModule() {
  if (!faissModulePromise) {
    faissModulePromise = import('faiss-node')
      .then((module) => module.default || module)
      .catch(() => null)
  }
  return faissModulePromise
}

function cosineSimilarity(a = [], b = []) {
  if (!a.length || !b.length || a.length !== b.length) return 0

  let dot = 0
  let normA = 0
  let normB = 0
  for (let i = 0; i < a.length; i += 1) {
    dot += a[i] * b[i]
    normA += a[i] * a[i]
    normB += b[i] * b[i]
  }
  if (!normA || !normB) return 0
  return dot / (Math.sqrt(normA) * Math.sqrt(normB))
}

function loadMetadata(metadataPath) {
  if (!fs.existsSync(metadataPath)) {
    return []
  }

  try {
    return JSON.parse(fs.readFileSync(metadataPath, 'utf8'))
  } catch {
    return []
  }
}

function saveMetadata(metadataPath, records) {
  fs.writeFileSync(metadataPath, JSON.stringify(records, null, 2), 'utf8')
}

function toFaissDocument(item, index) {
  const metadata = item?.metadata || {}

  return {
    id: item?.id || metadata.id || `faiss-doc-${index + 1}`,
    title: metadata.title || metadata.case_title || metadata.file_name || `FAISS document ${index + 1}`,
    summary:
      metadata.summary ||
      metadata.text ||
      item?.text ||
      'No summary available for this FAISS document.',
    source: metadata.source || 'faiss',
    score: Number(item?.score || metadata.score || 0),
    metadata,
  }
}

function matchesFaissFilter(metadata = {}, filter = null) {
  const must = Array.isArray(filter?.must) ? filter.must : []
  if (!must.length) return true

  return must.every((condition) => {
    const key = condition?.key
    const expected = condition?.match?.value
    if (!key) return true
    return String(metadata?.[key] ?? '') === String(expected ?? '')
  })
}

async function queryFaissNodeDocuments({
  queryText = '',
  vector = [],
  topK = 5,
  indexName,
  filter = null,
}) {
  const faiss = await loadFaissModule()
  const { indexPath, metadataPath } = getIndexPaths(indexName)

  if (!faiss || !fs.existsSync(indexPath)) {
    return null
  }

  try {
    const metadataRecords = loadMetadata(metadataPath)
    if (!metadataRecords.length) {
      return {
        documents: [],
        meta: {
          available: true,
          reason: 'ok',
          provider: 'faiss',
          index: indexName,
          backend: 'faiss-node',
        },
      }
    }

    const scored = metadataRecords
      .filter((record) => matchesFaissFilter(record.metadata || {}, filter))
      .map((record) => ({
        ...record,
        score:
          Array.isArray(vector) && vector.length
            ? cosineSimilarity(vector, record.vector || [])
            : lexicalOverlapScore(
                queryText,
                `${record?.metadata?.title || ''} ${record?.metadata?.summary || ''} ${record?.metadata?.text || record?.text || ''}`,
              ),
      }))
      .filter((record) => record.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, topK)

    return {
      documents: scored.map((item, index) => toFaissDocument(item, index)),
      meta: {
        available: true,
        reason: 'ok',
        provider: 'faiss',
        index: indexName,
        backend: 'faiss-node',
      },
    }
  } catch (error) {
    logger.warn('faiss-node retrieval failed, will fall back if possible.', {
      message: error?.message || String(error),
      indexName,
    })
    return null
  }
}

async function upsertFaissNodeDocuments({
  indexName,
  records = [],
}) {
  const faiss = await loadFaissModule()
  if (!faiss) {
    return null
  }

  try {
    ensureIndexDir()
    const { IndexFlatL2 } = faiss
    const { indexPath, metadataPath } = getIndexPaths(indexName)

    const existingRecords = loadMetadata(metadataPath)
    const mergedById = new Map()

    for (const record of existingRecords) {
      if (record?.id) mergedById.set(record.id, record)
    }

    for (const record of records) {
      if (!record?.id || !Array.isArray(record.vector) || !record.vector.length) continue
      mergedById.set(record.id, {
        id: record.id,
        text: record.text,
        vector: record.vector,
        metadata: record.metadata || {},
      })
    }

    const mergedMetadata = Array.from(mergedById.values()).filter(
      (record) => Array.isArray(record.vector) && record.vector.length,
    )
    const vectorDimension = mergedMetadata[0]?.vector?.length || 0
    if (!vectorDimension || !records.length) {
      return {
        success: Boolean(records.length === 0),
        reason: records.length ? 'no_vectors' : 'no_records',
        provider: 'faiss',
        index: indexName,
        indexed_count: 0,
        backend: 'faiss-node',
      }
    }

    const index = new IndexFlatL2(vectorDimension)

    for (const record of mergedMetadata) {
      index.add(record.vector)
    }

    if (typeof index.write === 'function') {
      index.write(indexPath)
    } else if (typeof index.toBuffer === 'function') {
      fs.writeFileSync(indexPath, index.toBuffer())
    }
    saveMetadata(metadataPath, mergedMetadata)

    return {
      success: true,
      reason: 'ok',
      provider: 'faiss',
      index: indexName,
      indexed_count: records.length,
      backend: 'faiss-node',
    }
  } catch (error) {
    logger.warn('faiss-node upsert failed, will fall back if possible.', {
      message: error?.message || String(error),
      indexName,
    })
    return null
  }
}

async function queryFaissServiceDocuments({
  queryText = '',
  topK = 5,
  vector = [],
  indexName = env.FAISS_EVIDENCE_INDEX,
  filter = null,
}) {
  const queryUrl = getFaissQueryUrl()

  if (!queryUrl) {
    return {
      documents: [],
      meta: {
        available: false,
        reason: 'faiss_not_configured',
        provider: 'faiss',
        index: indexName,
        backend: 'service',
      },
    }
  }

  try {
    const response = await fetch(queryUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        query_text: queryText,
        query_vector: Array.isArray(vector) && vector.length ? vector : undefined,
        top_k: topK,
        index_name: indexName,
        filter,
      }),
    })

    if (!response.ok) {
      throw new Error(`FAISS query failed with status ${response.status}`)
    }

    const payload = await response.json()
    const records = payload?.results || payload?.documents || []

    return {
      documents: records.map((item, index) => toFaissDocument(item, index)),
      meta: {
        available: true,
        reason: 'ok',
        provider: 'faiss',
        index: indexName,
        backend: 'service',
      },
    }
  } catch (error) {
    logger.warn('FAISS retrieval failed. Returning empty results.', {
      message: error?.message || String(error),
      indexName,
    })
    return {
      documents: [],
      meta: {
        available: false,
        reason: 'faiss_query_failed',
        provider: 'faiss',
        index: indexName,
        backend: 'service',
      },
    }
  }
}

async function upsertFaissServiceDocuments({
  indexName = env.FAISS_EVIDENCE_INDEX,
  records = [],
}) {
  const upsertUrl = getFaissUpsertUrl()

  if (!upsertUrl) {
    return {
      success: false,
      reason: 'faiss_not_configured',
      provider: 'faiss',
      index: indexName,
      indexed_count: 0,
      backend: 'service',
    }
  }

  if (!records.length) {
    return {
      success: true,
      reason: 'no_records',
      provider: 'faiss',
      index: indexName,
      indexed_count: 0,
      backend: 'service',
    }
  }

  try {
    const response = await fetch(upsertUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        index_name: indexName,
        records: records.map((item) => ({
          id: item.id,
          vector: item.vector,
          text: item.text,
          metadata: item.metadata || {},
        })),
      }),
    })

    if (!response.ok) {
      throw new Error(`FAISS upsert failed with status ${response.status}`)
    }

    return {
      success: true,
      reason: 'ok',
      provider: 'faiss',
      index: indexName,
      indexed_count: records.length,
      backend: 'service',
    }
  } catch (error) {
    logger.warn('FAISS upsert failed.', {
      message: error?.message || String(error),
      indexName,
    })
    return {
      success: false,
      reason: 'faiss_upsert_failed',
      provider: 'faiss',
      index: indexName,
      indexed_count: 0,
      backend: 'service',
    }
  }
}

export async function queryFaissDocuments({
  queryText = '',
  topK = 5,
  vector = [],
  indexName = env.FAISS_EVIDENCE_INDEX,
  filter = null,
}) {
  if (shouldPreferFaissService()) {
    return queryFaissServiceDocuments({
      queryText,
      topK,
      vector,
      indexName,
      filter,
    })
  }

  const nodeResult = await queryFaissNodeDocuments({
    queryText,
    vector,
    topK,
    indexName,
    filter,
  })
  if (nodeResult) return nodeResult

  return queryFaissServiceDocuments({
    queryText,
    topK,
    vector,
    indexName,
    filter,
  })
}

export async function upsertFaissDocuments({
  indexName = env.FAISS_EVIDENCE_INDEX,
  records = [],
}) {
  if (shouldPreferFaissService()) {
    return upsertFaissServiceDocuments({
      indexName,
      records,
    })
  }

  const nodeResult = await upsertFaissNodeDocuments({
    indexName,
    records,
  })
  if (nodeResult) return nodeResult

  return upsertFaissServiceDocuments({
    indexName,
    records,
  })
}
