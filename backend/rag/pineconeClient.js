import { Pinecone } from '@pinecone-database/pinecone'
import { env } from '../config/envConfig.js'
import { logger } from '../utils/logger.js'

let pineconeIndex = null

export async function getPineconeIndex() {
  if (pineconeIndex) return pineconeIndex

  if (!env.PINECONE_API_KEY || !env.PINECONE_INDEX) {
    logger.warn('Pinecone env vars missing. Vector retrieval is unavailable.')
    return null
  }

  const pinecone = new Pinecone({
    apiKey: env.PINECONE_API_KEY,
  })

  pineconeIndex = pinecone.index(env.PINECONE_INDEX)
  return pineconeIndex
}

export async function upsertPineconeRecords(records = [], namespace = '') {
  const index = await getPineconeIndex()
  if (!index) {
    return {
      success: false,
      reason: 'pinecone_not_configured',
      provider: 'pinecone',
      indexed_count: 0,
      namespace,
    }
  }

  if (!records.length) {
    return {
      success: true,
      reason: 'no_records',
      provider: 'pinecone',
      indexed_count: 0,
      namespace,
    }
  }

  try {
    const scopedIndex = namespace ? index.namespace(namespace) : index
    await scopedIndex.upsert(records)
    return {
      success: true,
      reason: 'ok',
      provider: 'pinecone',
      indexed_count: records.length,
      namespace,
    }
  } catch (error) {
    logger.warn('Pinecone upsert failed.', {
      message: error?.message || String(error),
      namespace,
    })
    return {
      success: false,
      reason: 'pinecone_upsert_failed',
      provider: 'pinecone',
      indexed_count: 0,
      namespace,
    }
  }
}
