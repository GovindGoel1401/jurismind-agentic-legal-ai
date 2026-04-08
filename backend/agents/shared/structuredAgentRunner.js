import { logger } from '../../utils/logger.js'
import { generateWithVertexDetailed } from '../../services/vertexLLM.js'
import { safeJsonParse } from './agentOutput.js'

function normalizeIssues(error) {
  if (!error) return []
  if (error.issues) {
    return error.issues.map((issue) => issue.message || `${issue.path?.join('.')}: invalid`)
  }
  return [error.message || 'Unknown validation error']
}

function buildFallbackMeta({ llmResult, source, issues }) {
  return {
    source,
    durationMs: llmResult.durationMs,
    model: llmResult.model,
    usage: llmResult.usage,
    issues,
    rawTextPreview: String(llmResult.text || '').slice(0, 220),
  }
}

export function withFallbackGuard(buildFallback, input) {
  return () => {
    try {
      return typeof buildFallback === 'function' ? buildFallback(input) : {}
    } catch (error) {
      logger.error('Fallback builder failed. Returning empty object.', error?.message || error)
      return {}
    }
  }
}

export function parseStructuredAgentResponse({
  agentName,
  schema,
  fallback,
  transformValidated,
  llmResult,
}) {
  const fallbackValue = fallback()
  const parsedJson = safeJsonParse(llmResult.text)

  if (parsedJson) {
    const validation = schema.safeParse(parsedJson)
    if (validation.success) {
      const normalized = transformValidated ? transformValidated(validation.data) : validation.data

      logger.info(`[${agentName}] Structured output validated.`, {
        durationMs: llmResult.durationMs,
        model: llmResult.model,
      })

      return {
        data: normalized,
        meta: {
          source: 'validated_llm',
          durationMs: llmResult.durationMs,
          model: llmResult.model,
          usage: llmResult.usage,
          issues: [],
          rawTextPreview: String(llmResult.text || '').slice(0, 220),
        },
      }
    }

    const issues = normalizeIssues(validation.error)
    logger.warn(`[${agentName}] Schema validation failed. Using fallback.`, {
      issues,
      durationMs: llmResult.durationMs,
    })
    return {
      data: fallbackValue,
      meta: buildFallbackMeta({
        llmResult,
        source: 'fallback_validation_failed',
        issues,
      }),
    }
  }

  logger.warn(`[${agentName}] Response was not valid JSON. Using fallback.`, {
    durationMs: llmResult.durationMs,
  })
  return {
    data: fallbackValue,
    meta: buildFallbackMeta({
      llmResult,
      source: 'fallback_parse_failed',
      issues: ['Response was not valid JSON.'],
    }),
  }
}

export async function runStructuredAgent({
  agentName,
  prompt,
  schema,
  fallback,
  transformValidated,
}) {
  const llmResult = await generateWithVertexDetailed({ prompt, label: agentName })
  return parseStructuredAgentResponse({
    agentName,
    schema,
    fallback,
    transformValidated,
    llmResult,
  })
}
