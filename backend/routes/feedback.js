import express from 'express'
import { feedbackInsightsSchema, feedbackSchema } from '../models/requestSchemas.js'
import { env } from '../config/envConfig.js'
import { getInMemoryFeedback, storeFeedbackEntry } from '../services/feedbackLearningService.js'
import { buildFeedbackInsights } from '../services/feedbackIntelligence/feedbackInsightService.js'
import {
  buildFeedbackAlerts,
  buildFeedbackPatterns,
} from '../services/feedbackIntelligence/feedbackPatternService.js'
import { createValidatedHandler, sendSuccess } from '../utils/routeHandlers.js'

const router = express.Router()

router.post(
  '/',
  createValidatedHandler({
    schema: feedbackSchema,
    routeName: 'feedback-submit',
    handler: async ({ data, res, requestContext }) => {
      const feedback_item = await storeFeedbackEntry(data)

      return res.status(201).json({
        success: true,
        data: {
          feedback_item,
        },
        meta: {
          requestId: requestContext?.requestId || null,
        },
      })
    },
  }),
)

router.post(
  '/insights',
  createValidatedHandler({
    schema: feedbackInsightsSchema,
    routeName: 'feedback-insights',
    handler: async ({ data, res, requestContext }) => {
      const feedback_insights = await buildFeedbackInsights({
        caseInput: data.case_input,
        filters: data.filters,
      })

      return sendSuccess(
        res,
        {
          feedback_insights,
        },
        {
          requestId: requestContext?.requestId || null,
        },
      )
    },
  }),
)

router.get('/internal/patterns', async (req, res, next) => {
  try {
    const filters = {
      case_id: req.query.case_id,
      session_id: req.query.session_id,
      feedback_type: req.query.feedback_type,
      phase_context: req.query.phase_context,
      linked_feature_or_agent: req.query.linked_feature_or_agent,
      issue_tags: req.query.issue_tag ? [String(req.query.issue_tag)] : undefined,
    }
    const patterns = await buildFeedbackPatterns({ filters })

    return sendSuccess(
      res,
      {
        feedback_patterns: patterns,
      },
      {
        requestId: req.requestContext?.requestId || null,
      },
    )
  } catch (error) {
    return next(error)
  }
})

router.get('/internal/alerts', async (req, res, next) => {
  try {
    const filters = {
      case_id: req.query.case_id,
      session_id: req.query.session_id,
      feedback_type: req.query.feedback_type,
      phase_context: req.query.phase_context,
      linked_feature_or_agent: req.query.linked_feature_or_agent,
      issue_tags: req.query.issue_tag ? [String(req.query.issue_tag)] : undefined,
    }
    const alerts = await buildFeedbackAlerts({ filters })

    return sendSuccess(
      res,
      {
        feedback_alerts: alerts,
      },
      {
        requestId: req.requestContext?.requestId || null,
      },
    )
  } catch (error) {
    return next(error)
  }
})

router.get('/debug/in-memory', (_req, res) => {
  if (env.NODE_ENV !== 'development') {
    return res.status(403).json({
      success: false,
      error: 'Debug endpoint is available only in development.',
    })
  }

  res.json({
    success: true,
    data: getInMemoryFeedback(),
  })
})

export default router
