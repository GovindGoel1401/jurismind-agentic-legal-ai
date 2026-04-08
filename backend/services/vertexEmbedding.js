import { env } from '../config/envConfig.js'
import { logger } from '../utils/logger.js'
import { callVertexAiModel, extractVertexEmbeddingValues } from './vertexAiApi.js'

const unsupportedEmbeddingRequests = new Set()

async function callVertexEmbedding(modelName, action, body) {
  const requestKey = `${modelName}:${action}`
  if (unsupportedEmbeddingRequests.has(requestKey)) {
    return null
  }

  try {
    const payload = await callVertexAiModel({
      modelName,
      action,
      body,
      requireStandardAuth: false,
    })
    return extractVertexEmbeddingValues(payload)
  } catch (error) {
    const message = error?.message || String(error)
    if (/status 404/i.test(message)) {
      unsupportedEmbeddingRequests.add(requestKey)
    }

    logger.warn('Vertex AI embedding request failed.', {
      message,
      model: modelName,
      action,
    })
    return null
  }
}

export async function createVertexTextEmbedding(text) {
  return callVertexEmbedding(env.VERTEX_AI_TEXT_EMBEDDING_MODEL, 'embedContent', {
    content: {
      role: 'user',
      parts: [{ text: String(text || '') }],
    },
  })
}

export async function createVertexMultimodalEmbedding({ text = '' } = {}) {
  return callVertexEmbedding(env.VERTEX_AI_MULTIMODAL_MODEL, 'predict', {
    instances: [
      {
        text,
      },
    ],
  })
}

export async function createVertexEmbedding(text, options = {}) {
  const modality = options.modality || 'text'

  if (modality === 'multimodal') {
    const multimodal = await createVertexMultimodalEmbedding({ text })
    if (Array.isArray(multimodal) && multimodal.length) return multimodal
  }

  return createVertexTextEmbedding(text)
}
