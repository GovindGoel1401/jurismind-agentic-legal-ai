import { env } from '../config/envConfig.js'
import { logger } from '../utils/logger.js'
import {
  callVertexAiModel,
  extractVertexResponseText,
  hasVertexAiGenerationAuth,
  normalizeVertexUsage,
} from './vertexAiApi.js'

const VERTEX_MODEL_FALLBACKS = ['gemini-2.5-flash-lite']

export function getConfiguredVertexModels() {
  return [env.VERTEX_AI_MODEL, ...VERTEX_MODEL_FALLBACKS].filter(
    (modelName, index, array) => modelName && array.indexOf(modelName) === index,
  )
}

export async function generateWithVertexDetailed({ prompt, label = 'unnamed-llm-call' }) {
  const startedAt = Date.now()

  if (!hasVertexAiGenerationAuth()) {
    logger.warn('Vertex AI generation auth is missing. Returning placeholder LLM output.')
    return {
      text: '[TODO] Vertex AI output placeholder.',
      durationMs: Date.now() - startedAt,
      model: env.VERTEX_AI_MODEL,
      usage: null,
    }
  }

  const candidateModels = getConfiguredVertexModels()
  let lastError = null

  for (const modelName of candidateModels) {
    try {
      const payload = await callVertexAiModel({
        modelName,
        action: 'generateContent',
        body: {
          contents: [
            {
              role: 'user',
              parts: [{ text: String(prompt || '') }],
            },
          ],
        },
      })
      const text = extractVertexResponseText(payload)
      const usage = normalizeVertexUsage(payload?.usageMetadata)
      const durationMs = Date.now() - startedAt

      logger.info(`[LLM] ${label} completed.`, {
        durationMs,
        model: modelName,
        usage,
        promptChars: String(prompt || '').length,
      })

      return {
        text,
        durationMs,
        model: modelName,
        usage,
      }
    } catch (error) {
      lastError = error
      const message = error?.message || String(error)
      const shouldTryFallback =
        /404/i.test(message) ||
        /not found/i.test(message) ||
        /not supported/i.test(message) ||
        /unsupported/i.test(message)

      logger.error(`[LLM] ${label} failed.`, {
        message,
        model: modelName,
        promptChars: String(prompt || '').length,
      })

      if (!shouldTryFallback || modelName === candidateModels[candidateModels.length - 1]) {
        throw error
      }

      logger.warn(`[LLM] ${label} retrying with fallback Vertex model.`, {
        failedModel: modelName,
        fallbackModel: candidateModels[candidateModels.indexOf(modelName) + 1],
      })
    }
  }

  throw lastError
}

export async function generateWithVertex(prompt) {
  const result = await generateWithVertexDetailed({ prompt })
  return result.text
}
