import express from 'express'
import { z } from 'zod'
import {
  analyzeCaseSchema,
  feedbackSchema,
} from '../models/requestSchemas.js'
import {
  createCaseWorkflow,
  getCaseRecord,
  getCaseWorkflowState,
  listCaseRecords,
  updateCaseWorkflowState,
} from '../services/caseStorageService.js'
import {
  buildAnalysisWorkflowPatch,
  buildDocumentWorkflowPatch,
  normalizeCaseInputPayload,
  runAnalyzeCaseWorkflow,
  runDocumentIntelligenceStage,
  runSimilarCasesStage,
} from '../services/caseOrchestrationService.js'
import { buildAndStoreCaseKnowledgeGraph } from '../services/caseKnowledgeGraphService.js'
import { env } from '../config/envConfig.js'
import {
  applyDebateAnswer,
  initializeDebateSession,
  selectDebateQuestion,
} from '../services/debateSimulation/debateSessionService.js'
import { storeFeedbackEntry } from '../services/feedbackLearningService.js'
import { buildFeedbackInsights } from '../services/feedbackIntelligence/feedbackInsightService.js'
import {
  buildFeedbackAlerts,
  buildFeedbackPatterns,
} from '../services/feedbackIntelligence/feedbackPatternService.js'
import { createValidatedHandler, sendSuccess } from '../utils/routeHandlers.js'

const router = express.Router()

const caseScopedDebateStartSchema = z.object({
  reset: z.coerce.boolean().optional().default(false),
})

const caseScopedDebateAnswerSchema = z.object({
  question_id: z.string().min(1),
  selected_answer_option_id: z.string().optional().default(''),
  custom_answer: z.string().max(4000).optional().default(''),
})

const caseScopedDebateSelectSchema = z.object({
  question_id: z.string().min(1),
})

const caseScopedSimilarCasesSchema = z.object({
  query: z.string().min(10).max(2000).optional().default(''),
  topK: z.coerce.number().int().min(1).max(10).optional().default(8),
})

function sendCaseNotFound(res, requestId) {
  return res.status(404).json({
    success: false,
    error: 'Case not found.',
    requestId,
  })
}

function hasObjectContent(value) {
  return Boolean(value && typeof value === 'object' && Object.keys(value).length)
}

function mergeCaseInput(existingCaseInput = {}, incoming = {}) {
  return normalizeCaseInputPayload({
    ...existingCaseInput,
    ...incoming,
    description:
      incoming.description ||
      incoming.caseText ||
      existingCaseInput.description ||
      existingCaseInput.caseText ||
      '',
    evidence:
      incoming.evidence ||
      existingCaseInput.evidence ||
      [],
  })
}

function buildFeedbackWarningFlags(entries = [], alerts = []) {
  const lowUsefulnessCount = entries.filter((entry) => {
    const rating = Number(entry?.user_rating || entry?.payload?.advice_usefulness_rating || 0)
    return rating > 0 && rating <= 2
  }).length

  const correctnessConcernCount = entries.filter(
    (entry) => entry?.feedback_type === 'answer_correctness_concern',
  ).length

  const warningFlags = []

  if (lowUsefulnessCount >= 2) {
    warningFlags.push('Repeated low usefulness ratings detected for this case workflow.')
  }
  if (correctnessConcernCount >= 2) {
    warningFlags.push('Repeated correctness concerns detected for this case workflow.')
  }
  if (alerts.length) {
    alerts.slice(0, 3).forEach((alert) => {
      warningFlags.push(
        `Repeated feedback pattern detected for ${alert.issue_tag} at ${alert.stage}.`,
      )
    })
  }

  return warningFlags
}

router.get('/', async (req, res, next) => {
  try {
    const cases = await listCaseRecords(12)
    return sendSuccess(
      res,
      { cases },
      {
        requestId: req.requestContext?.requestId || null,
      },
    )
  } catch (error) {
    return next(error)
  }
})

router.post(
  '/',
  createValidatedHandler({
    schema: analyzeCaseSchema,
    routeName: 'case-create',
    handler: async ({ data, res, requestContext }) => {
      const caseInput = normalizeCaseInputPayload(data)
      const record = await createCaseWorkflow(caseInput)

      return sendSuccess(
        res,
        record,
        {
          requestId: requestContext?.requestId || null,
        },
      )
    },
  }),
)

router.get('/:caseId/state', async (req, res, next) => {
  try {
    const record = await getCaseRecord(req.params.caseId)
    if (!record) {
      return sendCaseNotFound(res, req.requestContext?.requestId || null)
    }

    return sendSuccess(
      res,
      record,
      {
        requestId: req.requestContext?.requestId || null,
      },
    )
  } catch (error) {
    return next(error)
  }
})

router.post('/:caseId/document-intelligence', async (req, res, next) => {
  try {
    const record = await getCaseRecord(req.params.caseId)
    if (!record) {
      return sendCaseNotFound(res, req.requestContext?.requestId || null)
    }

    const caseInput = mergeCaseInput(record.caseInput, req.body || {})
    const { structuredCase, documentIntelligence } = await runDocumentIntelligenceStage(caseInput)

    const preAnalysisKnowledgeGraph =
      env.KNOWLEDGE_GRAPH_ENABLED
        ? await buildAndStoreCaseKnowledgeGraph({
            caseId: req.params.caseId,
            caseInput,
            graphResult: {
              structuredCase,
              case_type: structuredCase?.case_type || caseInput?.category || '',
              jurisdiction: structuredCase?.jurisdiction || caseInput?.jurisdiction || '',
              case_summary: caseInput?.description || '',
            },
            documentIntelligence,
          })
        : null

    await updateCaseWorkflowState(
      req.params.caseId,
      buildDocumentWorkflowPatch({
        caseInput,
        caseId: req.params.caseId,
        structuredCase,
        documentIntelligence,
      }),
    )

    if (preAnalysisKnowledgeGraph) {
      await updateCaseWorkflowState(req.params.caseId, {
        analysis: {
          response: {
            ...(record.workflowState?.analysis?.response || {}),
            knowledgeGraph: preAnalysisKnowledgeGraph,
          },
          updated_at: new Date().toISOString(),
        },
      })
    }

    return sendSuccess(
      res,
      {
        ...documentIntelligence,
        pre_analysis_knowledge_graph: preAnalysisKnowledgeGraph,
        caseMeta: {
          case_id: req.params.caseId,
        },
      },
      {
        requestId: req.requestContext?.requestId || null,
      },
    )
  } catch (error) {
    return next(error)
  }
})

router.get('/:caseId/document-intelligence', async (req, res, next) => {
  try {
    const workflowState = await getCaseWorkflowState(req.params.caseId)
    if (!workflowState) {
      return sendCaseNotFound(res, req.requestContext?.requestId || null)
    }

    return sendSuccess(
      res,
      workflowState.documents || {},
      {
        requestId: req.requestContext?.requestId || null,
      },
    )
  } catch (error) {
    return next(error)
  }
})

router.post('/:caseId/analyze', async (req, res, next) => {
  try {
    const record = await getCaseRecord(req.params.caseId)
    if (!record) {
      return sendCaseNotFound(res, req.requestContext?.requestId || null)
    }

    const caseInput = mergeCaseInput(record.caseInput, req.body || {})
    const analysisWorkflow = await runAnalyzeCaseWorkflow({
      caseInput,
      caseId: req.params.caseId,
      createdAt: record.created_at,
    })

    const responseData = {
      ...analysisWorkflow.analysisResponse,
      verdict:
        analysisWorkflow.analysisResponse?.verdict ||
        analysisWorkflow.verdict ||
        {},
    }

    if (!hasObjectContent(responseData.verdict)) {
      return res.status(500).json({
        success: false,
        error: 'Analysis completed without a persisted verdict payload.',
        requestId: req.requestContext?.requestId || null,
      })
    }

    await updateCaseWorkflowState(
      req.params.caseId,
      buildAnalysisWorkflowPatch({
        caseInput,
        caseId: req.params.caseId,
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

    const persistedWorkflowState = await getCaseWorkflowState(req.params.caseId)
    if (!hasObjectContent(persistedWorkflowState?.verdict)) {
      return res.status(500).json({
        success: false,
        error: 'Analysis response was generated, but verdict persistence did not complete.',
        requestId: req.requestContext?.requestId || null,
      })
    }

    return sendSuccess(
      res,
      responseData,
      {
        requestId: req.requestContext?.requestId || null,
      },
    )
  } catch (error) {
    return next(error)
  }
})

router.get('/:caseId/analysis', async (req, res, next) => {
  try {
    const workflowState = await getCaseWorkflowState(req.params.caseId)
    if (!workflowState) {
      return sendCaseNotFound(res, req.requestContext?.requestId || null)
    }

    return sendSuccess(
      res,
      workflowState.analysis?.response || {},
      {
        requestId: req.requestContext?.requestId || null,
      },
    )
  } catch (error) {
    return next(error)
  }
})

router.post('/:caseId/verdict', async (req, res, next) => {
  try {
    const workflowState = await getCaseWorkflowState(req.params.caseId)
    if (!workflowState) {
      return sendCaseNotFound(res, req.requestContext?.requestId || null)
    }

    return sendSuccess(
      res,
      workflowState.verdict || workflowState.analysis?.response?.verdict || {},
      {
        requestId: req.requestContext?.requestId || null,
      },
    )
  } catch (error) {
    return next(error)
  }
})

router.get('/:caseId/verdict', async (req, res, next) => {
  try {
    const workflowState = await getCaseWorkflowState(req.params.caseId)
    if (!workflowState) {
      return sendCaseNotFound(res, req.requestContext?.requestId || null)
    }

    return sendSuccess(
      res,
      workflowState.verdict || workflowState.analysis?.response?.verdict || {},
      {
        requestId: req.requestContext?.requestId || null,
      },
    )
  } catch (error) {
    return next(error)
  }
})

router.post('/:caseId/similar-cases/search', async (req, res, next) => {
  try {
    const parsed = caseScopedSimilarCasesSchema.safeParse(req.body || {})
    if (!parsed.success) {
      return res.status(400).json({
        success: false,
        error: parsed.error.issues.map((issue) => issue.message).join('; '),
        requestId: req.requestContext?.requestId || null,
      })
    }

    const record = await getCaseRecord(req.params.caseId)
    if (!record) {
      return sendCaseNotFound(res, req.requestContext?.requestId || null)
    }

    const workflowState = record.workflowState || {}
    const query =
      String(parsed.data.query || workflowState.similar_cases?.last_query || record.caseInput?.description || '').trim()
    if (query.length < 10) {
      return res.status(400).json({
        success: false,
        error: 'Enter at least 10 characters to search similar cases.',
        requestId: req.requestContext?.requestId || null,
      })
    }

    const caseInput = mergeCaseInput(record.caseInput, {
      description: query,
      caseText: query,
    })
    const similarCasesStage = await runSimilarCasesStage({
      caseInput,
      structuredCase: workflowState.documents?.structured_case || {},
      documentIntelligence:
        workflowState.documents || workflowState.analysis?.response?.documentIntelligence || {},
      caseAssessment:
        workflowState.analysis?.response?.caseAssessment ||
        workflowState.analysis?.case_assessment ||
        {},
      topK: parsed.data.topK,
    })

    const responseData = {
      ...similarCasesStage.similarCaseIntelligence,
      retrievalQueryRewrite: similarCasesStage.rewrittenQueries,
      caseMeta: {
        case_id: req.params.caseId,
      },
    }

    await updateCaseWorkflowState(req.params.caseId, {
      similar_cases: {
        last_query: query,
        result: responseData,
        updated_at: new Date().toISOString(),
      },
      traces: {
        retrievalQueryRewrite: similarCasesStage.rewrittenQueries,
      },
    })

    return sendSuccess(
      res,
      responseData,
      {
        requestId: req.requestContext?.requestId || null,
      },
    )
  } catch (error) {
    return next(error)
  }
})

router.get('/:caseId/similar-cases', async (req, res, next) => {
  try {
    const workflowState = await getCaseWorkflowState(req.params.caseId)
    if (!workflowState) {
      return sendCaseNotFound(res, req.requestContext?.requestId || null)
    }

    return sendSuccess(
      res,
      workflowState.similar_cases?.result || {},
      {
        requestId: req.requestContext?.requestId || null,
      },
    )
  } catch (error) {
    return next(error)
  }
})

router.post(
  '/:caseId/debate/start',
  createValidatedHandler({
    schema: caseScopedDebateStartSchema,
    routeName: 'case-debate-start',
    handler: async ({ data, req, res, requestContext }) => {
      const record = await getCaseRecord(req.params.caseId)
      if (!record) {
        return sendCaseNotFound(res, requestContext?.requestId || null)
      }

      const workflowState = record.workflowState || {}
      const existingDebate = workflowState.debate || {}
      const responseData = await initializeDebateSession({
        caseId: req.params.caseId,
        caseInput: record.caseInput || {},
        analysis: workflowState.analysis?.response || record.analysisResult || {},
        verdict: workflowState.verdict || record.analysisResult?.verdict || {},
        similarCaseIntelligence:
          workflowState.similar_cases?.result ||
          workflowState.analysis?.response?.similarCaseIntelligence ||
          {},
        sessionMemory: data.reset ? null : existingDebate.session_memory || null,
      })

      await updateCaseWorkflowState(req.params.caseId, {
        debate: {
          debate_session_id: responseData.debate_session_id,
          status: responseData.status,
          current_focus: responseData.current_focus,
          current_question: responseData.current_question,
          question_sets: responseData.question_sets,
          unresolved_issues: responseData.unresolved_issues,
          retrieval_trace: responseData.retrieval_trace,
          debate_summary: responseData.debate_summary,
          question_bank: responseData.question_bank,
          session_memory: responseData.session_memory,
          latest_scenario_update: data.reset ? null : existingDebate.latest_scenario_update || null,
          latest_answer_analysis: data.reset ? null : existingDebate.latest_answer_analysis || null,
          last_answer_review: data.reset ? null : existingDebate.last_answer_review || null,
          generation_meta: responseData.generation_meta || null,
          updated_at: new Date().toISOString(),
        },
      })

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

router.post(
  '/:caseId/debate/select-question',
  createValidatedHandler({
    schema: caseScopedDebateSelectSchema,
    routeName: 'case-debate-select-question',
    handler: async ({ data, req, res, requestContext }) => {
      const record = await getCaseRecord(req.params.caseId)
      if (!record) {
        return sendCaseNotFound(res, requestContext?.requestId || null)
      }

      const workflowState = record.workflowState || {}
      const debateState = workflowState.debate || {}

      if (!debateState.session_memory) {
        return res.status(409).json({
          success: false,
          error: 'Start the debate session before selecting a question.',
          requestId: requestContext?.requestId || null,
        })
      }

      const responseData = await selectDebateQuestion({
        caseId: req.params.caseId,
        questionId: data.question_id,
        caseInput: record.caseInput || {},
        analysis: workflowState.analysis?.response || record.analysisResult || {},
        verdict: workflowState.verdict || record.analysisResult?.verdict || {},
        similarCaseIntelligence:
          workflowState.similar_cases?.result ||
          workflowState.analysis?.response?.similarCaseIntelligence ||
          {},
        sessionMemory: debateState.session_memory,
      })

      if (responseData.error) {
        return res.status(400).json({
          success: false,
          error: responseData.error,
          requestId: requestContext?.requestId || null,
        })
      }

      await updateCaseWorkflowState(req.params.caseId, {
        debate: {
          debate_session_id: responseData.debate_session_id,
          status: responseData.status,
          current_focus: responseData.current_focus,
          current_question: responseData.current_question,
          question_sets: responseData.question_sets,
          unresolved_issues: responseData.unresolved_issues,
          retrieval_trace: responseData.retrieval_trace,
          debate_summary: responseData.debate_summary,
          question_bank: responseData.question_bank,
          session_memory: responseData.session_memory,
          latest_scenario_update: debateState.latest_scenario_update || null,
          latest_answer_analysis: debateState.latest_answer_analysis || null,
          last_answer_review: debateState.last_answer_review || null,
          generation_meta: debateState.generation_meta || null,
          updated_at: new Date().toISOString(),
        },
      })

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

router.post(
  '/:caseId/debate/answer',
  createValidatedHandler({
    schema: caseScopedDebateAnswerSchema,
    routeName: 'case-debate-answer',
    handler: async ({ data, req, res, requestContext }) => {
      const record = await getCaseRecord(req.params.caseId)
      if (!record) {
        return sendCaseNotFound(res, requestContext?.requestId || null)
      }

      const workflowState = record.workflowState || {}
      const debateState = workflowState.debate || {}

      if (!debateState.session_memory) {
        return res.status(409).json({
          success: false,
          error: 'Start the debate session before answering a question.',
          requestId: requestContext?.requestId || null,
        })
      }

      const responseData = await applyDebateAnswer({
        caseId: req.params.caseId,
        questionId: data.question_id,
        selectedAnswerOptionId: data.selected_answer_option_id,
        customAnswer: data.custom_answer,
        caseInput: record.caseInput || {},
        analysis: workflowState.analysis?.response || record.analysisResult || {},
        verdict: workflowState.verdict || record.analysisResult?.verdict || {},
        similarCaseIntelligence:
          workflowState.similar_cases?.result ||
          workflowState.analysis?.response?.similarCaseIntelligence ||
          {},
        sessionMemory: debateState.session_memory,
      })

      if (responseData.error) {
        return res.status(400).json({
          success: false,
          error: responseData.error,
          requestId: requestContext?.requestId || null,
        })
      }

      await updateCaseWorkflowState(req.params.caseId, {
        debate: {
          debate_session_id: responseData.debate_session_id,
          status: responseData.status,
          current_focus: responseData.current_focus,
          current_question: responseData.current_question,
          question_sets: responseData.question_sets,
          unresolved_issues: responseData.unresolved_issues,
          retrieval_trace: responseData.retrieval_trace,
          debate_summary: responseData.debate_summary,
          question_bank: responseData.question_bank,
          session_memory: responseData.session_memory,
          latest_scenario_update: responseData.scenario_update,
          latest_answer_analysis: responseData.answer_analysis,
          last_answer_review: responseData.last_answer_review,
          generation_meta: responseData.generation_meta || null,
          updated_at: new Date().toISOString(),
        },
      })

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

router.get('/:caseId/debate', async (req, res, next) => {
  try {
    const workflowState = await getCaseWorkflowState(req.params.caseId)
    if (!workflowState) {
      return sendCaseNotFound(res, req.requestContext?.requestId || null)
    }

    return sendSuccess(
      res,
      workflowState.debate || {},
      {
        requestId: req.requestContext?.requestId || null,
      },
    )
  } catch (error) {
    return next(error)
  }
})

router.post('/:caseId/feedback', async (req, res, next) => {
  try {
    const record = await getCaseRecord(req.params.caseId)
    if (!record) {
      return sendCaseNotFound(res, req.requestContext?.requestId || null)
    }

    const parsed = feedbackSchema.safeParse({
      ...req.body,
      case_id: req.params.caseId,
    })
    if (!parsed.success) {
      return res.status(400).json({
        success: false,
        error: parsed.error.issues.map((issue) => issue.message).join('; '),
        requestId: req.requestContext?.requestId || null,
      })
    }

    const feedbackItem = await storeFeedbackEntry(parsed.data)
    const existingEntries = Array.isArray(record.workflowState?.feedback?.entries)
      ? record.workflowState.feedback.entries
      : []
    const nextEntries = [...existingEntries, feedbackItem].slice(-20)
    const feedbackInsights = await buildFeedbackInsights({
      caseInput: record.caseInput || {},
      filters: {
        case_id: req.params.caseId,
      },
    })
    const feedbackPatterns = await buildFeedbackPatterns({
      filters: {
        case_id: req.params.caseId,
      },
    })
    const feedbackAlerts = await buildFeedbackAlerts({
      filters: {
        case_id: req.params.caseId,
      },
    })

    await updateCaseWorkflowState(req.params.caseId, {
      feedback: {
        entries: nextEntries,
        insights: feedbackInsights,
        patterns: feedbackPatterns,
        alerts: feedbackAlerts,
        warning_flags: buildFeedbackWarningFlags(nextEntries, feedbackAlerts),
        updated_at: new Date().toISOString(),
      },
    })

    return sendSuccess(
      res,
      {
        feedback_item: feedbackItem,
        feedback_insights: feedbackInsights,
        feedback_patterns: feedbackPatterns,
        feedback_alerts: feedbackAlerts,
      },
      {
        requestId: req.requestContext?.requestId || null,
      },
    )
  } catch (error) {
    return next(error)
  }
})

router.get('/:caseId/feedback', async (req, res, next) => {
  try {
    const workflowState = await getCaseWorkflowState(req.params.caseId)
    if (!workflowState) {
      return sendCaseNotFound(res, req.requestContext?.requestId || null)
    }

    return sendSuccess(
      res,
      workflowState.feedback || {},
      {
        requestId: req.requestContext?.requestId || null,
      },
    )
  } catch (error) {
    return next(error)
  }
})

router.get('/:caseId', async (req, res, next) => {
  try {
    const record = await getCaseRecord(req.params.caseId)
    if (!record) {
      return sendCaseNotFound(res, req.requestContext?.requestId || null)
    }

    return sendSuccess(
      res,
      record,
      {
        requestId: req.requestContext?.requestId || null,
      },
    )
  } catch (error) {
    return next(error)
  }
})

export default router
