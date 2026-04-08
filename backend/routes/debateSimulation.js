import express from 'express'
import {
  debateSimulationApplyAnswerSchema,
  debateSimulationSessionSchema,
} from '../models/requestSchemas.js'
import {
  applyDebateAnswer,
  initializeDebateSession,
} from '../services/debateSimulation/debateSessionService.js'
import { createValidatedHandler, sendSuccess } from '../utils/routeHandlers.js'

const router = express.Router()

router.post(
  '/session',
  createValidatedHandler({
    schema: debateSimulationSessionSchema,
    routeName: 'debate-session',
    handler: async ({ data, res, requestContext }) => {
      const { case_input, analysis, verdict, similar_case_intelligence, session_memory } = data
      const responseData = await initializeDebateSession({
        caseInput: case_input,
        analysis,
        verdict,
        similarCaseIntelligence: similar_case_intelligence,
        sessionMemory: session_memory,
      })

      return sendSuccess(res, responseData, {
        requestId: requestContext?.requestId || null,
      })
    },
  }),
)

router.post(
  '/apply-answer',
  createValidatedHandler({
    schema: debateSimulationApplyAnswerSchema,
    routeName: 'debate-apply-answer',
    handler: async ({ data, res, requestContext }) => {
      const { question_id, selected_answer_option_id, custom_answer, session_memory } = data
      const responseData = await applyDebateAnswer({
        questionId: question_id,
        selectedAnswerOptionId: selected_answer_option_id,
        customAnswer: custom_answer,
        sessionMemory: session_memory,
      })

      if (responseData.error) {
        return res.status(400).json({
          success: false,
          error: responseData.error,
          requestId: requestContext?.requestId || null,
        })
      }

      return sendSuccess(res, responseData, {
        requestId: requestContext?.requestId || null,
      })
    },
  }),
)

export default router
