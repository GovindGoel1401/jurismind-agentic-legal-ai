import { logger } from './logger.js'

function buildRequestId() {
  return `req_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`
}

export function attachRequestContext(req, res, next) {
  const requestId = buildRequestId()
  const startTime = Date.now()

  req.requestContext = {
    requestId,
    startTime,
  }

  res.setHeader('x-request-id', requestId)

  logger.info('Request started', {
    requestId,
    method: req.method,
    path: req.originalUrl,
  })

  res.on('finish', () => {
    logger.info('Request completed', {
      requestId,
      method: req.method,
      path: req.originalUrl,
      statusCode: res.statusCode,
      durationMs: Date.now() - startTime,
    })
  })

  next()
}
