import { env } from '../config/envConfig.js'
import { getVertexAccessHeaders } from './vertexAuth.js'

function buildStandardEndpoint(modelName, action) {
  if (!env.VERTEX_AI_PROJECT_ID || !env.VERTEX_AI_LOCATION || !modelName) return ''
  return `https://${env.VERTEX_AI_LOCATION}-aiplatform.googleapis.com/v1/projects/${env.VERTEX_AI_PROJECT_ID}/locations/${env.VERTEX_AI_LOCATION}/publishers/google/models/${modelName}:${action}`
}

function buildExpressEndpoint(modelName, action) {
  if (!modelName) return ''
  return `https://aiplatform.googleapis.com/v1/publishers/google/models/${modelName}:${action}`
}

export function getVertexApiKey() {
  return String(env.VERTEX_AI_API_KEY || '').trim()
}

export function hasVertexAiGenerationAuth() {
  return Boolean(
    getVertexApiKey() ||
      env.VERTEX_AI_ACCESS_TOKEN ||
      env.VERTEX_AI_SERVICE_ACCOUNT_JSON ||
      (env.VERTEX_AI_PROJECT_ID && env.VERTEX_AI_LOCATION),
  )
}

function hasExplicitVertexStandardAuthConfig() {
  return Boolean(env.VERTEX_AI_ACCESS_TOKEN || env.VERTEX_AI_SERVICE_ACCOUNT_JSON)
}

async function buildVertexRequestConfig({ modelName, action, requireStandardAuth = false }) {
  const hasStandardEndpoint = Boolean(env.VERTEX_AI_PROJECT_ID && env.VERTEX_AI_LOCATION && modelName)
  const shouldTryStandardAuth =
    hasStandardEndpoint &&
    (requireStandardAuth || hasExplicitVertexStandardAuthConfig() || !getVertexApiKey())

  if (shouldTryStandardAuth) {
    const standardHeaders = await getVertexAccessHeaders()
    if (standardHeaders?.Authorization) {
      return {
        endpoint: buildStandardEndpoint(modelName, action),
        headers: standardHeaders,
        authMode: 'oauth',
      }
    }
  }

  if (!requireStandardAuth) {
    const apiKey = getVertexApiKey()
    if (apiKey) {
      return {
        endpoint: `${buildExpressEndpoint(modelName, action)}?key=${encodeURIComponent(apiKey)}`,
        headers: {},
        authMode: 'api_key',
      }
    }
  }

  if (requireStandardAuth) {
    return {
      endpoint: '',
      headers: {},
      authMode: 'standard_auth_missing',
    }
  }

  return {
    endpoint: '',
    headers: {},
    authMode: 'none',
  }
}

async function parseErrorBody(response) {
  try {
    const text = await response.text()
    return text ? `: ${text.slice(0, 600)}` : ''
  } catch {
    return ''
  }
}

export async function callVertexAiModel({
  modelName,
  action,
  body,
  requireStandardAuth = false,
}) {
  const requestConfig = await buildVertexRequestConfig({ modelName, action, requireStandardAuth })
  if (!requestConfig.endpoint) {
    if (requireStandardAuth) {
      throw new Error(
        'Vertex AI standard authentication is not configured. Set VERTEX_AI_ACCESS_TOKEN or Application Default Credentials.',
      )
    }
    throw new Error('Vertex AI generation authentication is not configured.')
  }

  const response = await fetch(requestConfig.endpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...requestConfig.headers,
    },
    body: JSON.stringify(body),
  })

  if (!response.ok) {
    const errorBody = await parseErrorBody(response)
    throw new Error(
      `Vertex AI ${action} failed with status ${response.status}${errorBody}`,
    )
  }

  return response.json()
}

export function extractVertexResponseText(payload) {
  const parts = (payload?.candidates || []).flatMap((candidate) => candidate?.content?.parts || [])
  const text = parts
    .map((part) => String(part?.text || ''))
    .join('')
    .trim()

  if (text) return text

  const blockReason = payload?.promptFeedback?.blockReason || payload?.candidates?.[0]?.finishReason
  if (blockReason) {
    throw new Error(`Vertex AI returned no text output (${blockReason}).`)
  }

  throw new Error('Vertex AI returned no text output.')
}

export function extractVertexEmbeddingValues(payload) {
  const values =
    payload?.embedding?.values ||
    payload?.embeddings?.[0]?.values ||
    payload?.predictions?.[0]?.embeddings?.values ||
    payload?.predictions?.[0]?.embeddings?.textEmbedding ||
    payload?.predictions?.[0]?.values ||
    null

  return Array.isArray(values) ? values : null
}

export function normalizeVertexUsage(usage) {
  if (!usage) return null

  return {
    promptTokenCount: usage.promptTokenCount ?? usage.prompt_token_count ?? null,
    candidatesTokenCount: usage.candidatesTokenCount ?? usage.candidates_token_count ?? null,
    totalTokenCount: usage.totalTokenCount ?? usage.total_token_count ?? null,
  }
}
