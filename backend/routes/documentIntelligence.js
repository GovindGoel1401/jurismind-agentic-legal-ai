import express from 'express'
import { documentIntelligenceSchema } from '../models/requestSchemas.js'
import {
  normalizeCaseInputPayload,
  runDocumentIntelligenceStage,
} from '../services/caseOrchestrationService.js'
import { createValidatedHandler, sendSuccess } from '../utils/routeHandlers.js'

const router = express.Router()

router.post(
  '/',
  createValidatedHandler({
    schema: documentIntelligenceSchema,
    routeName: 'document-intelligence',
    handler: async ({ data, res, requestContext }) => {
      const caseInput = normalizeCaseInputPayload(data)
      const { documentIntelligence } = await runDocumentIntelligenceStage(caseInput)

      return sendSuccess(
        res,
        documentIntelligence,
        {
          requestId: requestContext?.requestId || null,
        },
      )
    },
  }),
)

export default router
