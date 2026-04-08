import { env } from '../config/envConfig.js'
import { logger } from '../utils/logger.js'

function buildDocumentFromRetrievalNode(item, index) {
  const node = item?.node || {}
  const metadata = node?.metadata || {}
  const text = node?.text || metadata?.text || ''

  return {
    id: metadata.id || node.id_ || node.id || `llama-cloud-doc-${index + 1}`,
    title:
      metadata.title ||
      metadata.case_title ||
      metadata.file_name ||
      metadata.source_name ||
      `LlamaCloud rule ${index + 1}`,
    summary: metadata.summary || text.slice(0, 800) || 'No summary available.',
    source: metadata.source || 'llama_cloud',
    score: Number(item?.score || 0),
    metadata: {
      ...metadata,
      text,
    },
  }
}

function isLlamaCloudConfigured() {
  return Boolean(env.LLAMA_CLOUD_API_KEY && env.LLAMA_CLOUD_PIPELINE_ID)
}

async function loadLlamaCloudSdk() {
  try {
    const module = await import('@llamaindex/llama-cloud')
    return module.default || module.LlamaCloud || null
  } catch (error) {
    logger.warn('LlamaCloud SDK is not installed. Falling back to existing rules store.', {
      message: error?.message || String(error),
    })
    return null
  }
}

export async function queryLlamaCloudRules({
  queryText = '',
  topK = env.LLAMA_CLOUD_RULES_TOP_K || 4,
}) {
  if (!isLlamaCloudConfigured()) {
    return {
      documents: [],
      meta: {
        available: false,
        reason: 'llama_cloud_not_configured',
        provider: 'llama_cloud',
        collection: env.LLAMA_CLOUD_PIPELINE_ID || '',
      },
    }
  }

  const LlamaCloud = await loadLlamaCloudSdk()
  if (!LlamaCloud) {
    return {
      documents: [],
      meta: {
        available: false,
        reason: 'llama_cloud_sdk_missing',
        provider: 'llama_cloud',
        collection: env.LLAMA_CLOUD_PIPELINE_ID || '',
      },
    }
  }

  try {
    process.env.LLAMA_CLOUD_API_KEY = env.LLAMA_CLOUD_API_KEY

    const client = new LlamaCloud()
    const results = await client.pipelines.retrieve(env.LLAMA_CLOUD_PIPELINE_ID, {
      query: queryText,
      dense_similarity_top_k: topK,
      sparse_similarity_top_k: topK,
      rerank_top_n: topK,
      enable_reranking: true,
    })

    const nodes = Array.isArray(results?.retrieval_nodes) ? results.retrieval_nodes : []

    return {
      documents: nodes.map((item, index) => buildDocumentFromRetrievalNode(item, index)),
      meta: {
        available: true,
        reason: 'ok',
        provider: 'llama_cloud',
        collection: env.LLAMA_CLOUD_PIPELINE_ID,
      },
    }
  } catch (error) {
    logger.warn('LlamaCloud retrieval failed. Falling back to existing rules store.', {
      message: error?.message || String(error),
      pipelineId: env.LLAMA_CLOUD_PIPELINE_ID || '',
    })
    return {
      documents: [],
      meta: {
        available: false,
        reason: 'llama_cloud_query_failed',
        provider: 'llama_cloud',
        collection: env.LLAMA_CLOUD_PIPELINE_ID || '',
      },
    }
  }
}
