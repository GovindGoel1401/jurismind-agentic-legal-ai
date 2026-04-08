import { logger } from './logger.js'

function collectValidationError(parsed) {
  return parsed.error.issues.map((issue) => issue.message).join('; ')
}

export function sendSuccess(res, data, meta = {}) {
  return res.json({
    success: true,
    data,
    meta,
  })
}

export function createValidatedHandler({ schema, handler, routeName }) {
  return async (req, res, next) => {
    try {
      const parsed = schema ? schema.safeParse(req.body || {}) : { success: true, data: req.body || {} }

      if (!parsed.success) {
        const errorMessage = collectValidationError(parsed)
        logger.warn('Request validation failed', {
          requestId: req.requestContext?.requestId || null,
          routeName,
          path: req.originalUrl,
          error: errorMessage,
        })

        return res.status(400).json({
          success: false,
          error: errorMessage,
          requestId: req.requestContext?.requestId || null,
        })
      }

      return await handler({
        req,
        res,
        next,
        data: parsed.data,
        requestContext: req.requestContext || {},
      })
    } catch (error) {
      return next(error)
    }
  }
}
