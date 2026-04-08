import { GoogleAuth } from 'google-auth-library'
import { env } from '../config/envConfig.js'
import { logger } from '../utils/logger.js'

const VERTEX_SCOPES = ['https://www.googleapis.com/auth/cloud-platform']
let authClientPromise = null
let serviceAccountCredentials = undefined

function getServiceAccountCredentials() {
  if (serviceAccountCredentials !== undefined) {
    return serviceAccountCredentials
  }

  const raw = String(env.VERTEX_AI_SERVICE_ACCOUNT_JSON || '').trim()
  if (!raw) {
    serviceAccountCredentials = null
    return serviceAccountCredentials
  }

  try {
    serviceAccountCredentials = JSON.parse(raw)
    return serviceAccountCredentials
  } catch (error) {
    logger.warn('VERTEX_AI_SERVICE_ACCOUNT_JSON is not valid JSON.', {
      message: error?.message || String(error),
    })
    serviceAccountCredentials = null
    return serviceAccountCredentials
  }
}

async function getAuthClient() {
  if (authClientPromise) return authClientPromise

  const credentials = getServiceAccountCredentials()
  const auth = new GoogleAuth({
    scopes: VERTEX_SCOPES,
    ...(credentials ? { credentials } : {}),
  })

  authClientPromise = auth.getClient().catch((error) => {
    authClientPromise = null
    throw error
  })

  return authClientPromise
}

export async function getVertexAccessHeaders() {
  if (env.VERTEX_AI_ACCESS_TOKEN) {
    return {
      Authorization: `Bearer ${env.VERTEX_AI_ACCESS_TOKEN}`,
    }
  }

  try {
    const client = await getAuthClient()
    const headers = await client.getRequestHeaders()
    const authorization = headers.Authorization || headers.authorization || ''

    if (!authorization) {
      logger.warn('Vertex AI OAuth headers were empty.')
      return null
    }

    return {
      Authorization: authorization,
    }
  } catch (error) {
    logger.warn('Vertex AI OAuth authentication is unavailable.', {
      message: error?.message || String(error),
    })
    return null
  }
}

export async function hasVertexStandardAuth() {
  const headers = await getVertexAccessHeaders()
  return Boolean(headers?.Authorization)
}
