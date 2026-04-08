import { logger } from './logger.js'
import { env } from '../config/envConfig.js'

export function errorHandler(error, req, res, _next) {
  const requestId = req?.requestContext?.requestId || null

  logger.error('Unhandled API error', {
    requestId,
    method: req?.method,
    path: req?.originalUrl,
    error,
  })

  const statusCode = error.statusCode || 500
  const safeMessage =
    statusCode >= 500 && env.NODE_ENV === 'production'
      ? 'Internal server error'
      : error.message || 'Internal server error'

  res.status(statusCode).json({
    success: false,
    error: safeMessage,
    requestId,
  })
}
