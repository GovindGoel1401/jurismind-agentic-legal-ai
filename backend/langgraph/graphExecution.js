import { logger } from '../utils/logger.js'

function normalizeError(error) {
  if (!error) return { message: 'Unknown error' }
  if (error instanceof Error) {
    return {
      message: error.message,
      stack: error.stack,
    }
  }
  return {
    message: String(error),
  }
}

export async function executeAgent(agentName, agentFn, statePayload) {
  const startedAt = Date.now()
  logger.info(`[Agent Start] ${agentName}`)
  try {
    const result = await agentFn(statePayload)
    const duration = Date.now() - startedAt
    logger.info(`[Agent Complete] ${agentName}`, {
      durationMs: duration,
      returnedKeys: Object.keys(result || {}),
    })
    return result
  } catch (error) {
    const duration = Date.now() - startedAt
    logger.error(`[Agent Error] ${agentName}`, {
      durationMs: duration,
      ...normalizeError(error),
    })
    throw error
  }
}
