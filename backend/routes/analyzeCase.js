import express from 'express'
import { analyzeCaseSchema } from '../models/requestSchemas.js'
import { createCaseWorkflow, updateCaseWorkflowState } from '../services/caseStorageService.js'
import {
  buildAnalysisWorkflowPatch,
  normalizeCaseInputPayload,
  runAnalyzeCaseWorkflow,
} from '../services/caseOrchestrationService.js'
import { createValidatedHandler, sendSuccess } from '../utils/routeHandlers.js'

const router = express.Router()

router.post(
  '/',
  createValidatedHandler({
    schema: analyzeCaseSchema,
    routeName: 'analyze-case',
    handler: async ({ data, res, requestContext }) => {
      const caseInput = normalizeCaseInputPayload(data)
      const createdCase = await createCaseWorkflow(caseInput)
      const caseId = String(createdCase.case_id || '')

      const analysisWorkflow = await runAnalyzeCaseWorkflow({
        caseInput,
        caseId,
        createdAt: createdCase.created_at,
      })

      const responseData = analysisWorkflow.analysisResponse

      await updateCaseWorkflowState(
        caseId,
        buildAnalysisWorkflowPatch({
          caseInput,
          caseId,
          documentIntelligence: analysisWorkflow.documentIntelligence,
          structuredCase: analysisWorkflow.graphResult?.structuredCase || {},
          analysisResponse: responseData,
          feedbackLearning: analysisWorkflow.feedbackLearning,
          caseAssessment: analysisWorkflow.caseAssessment,
          verdict: analysisWorkflow.verdict,
          similarCaseIntelligence: analysisWorkflow.similarCaseIntelligence,
          rewrittenQueries: analysisWorkflow.rewrittenQueries,
          similarCasesQuery: analysisWorkflow.similarCasesQuery,
        }),
      )

      return sendSuccess(
        res,
        responseData,
        {
          requestId: requestContext?.requestId || null,
        },
      )
    },
  }),
)

export default router
