import express from 'express'
import {
  knowledgeGraphQuerySchema,
  knowledgeGraphRebuildSchema,
  knowledgeGraphPatternQuerySchema,
} from '../models/requestSchemas.js'
import {
  buildCaseGraphInsights,
  findCaseContradictions,
  findHumanFactorsAffectingSettlement,
  findIssueClustersWithMissingEvidence,
  findStructurallySimilarCases,
  findStrategyActionsForWeaknesses,
  findUnresolvedIssuesForDebate,
  findUnsupportedClaims,
  getCaseReasoningSurface,
} from '../graph/caseGraphQueries.js'
import { rebuildKnowledgeGraphs } from '../services/knowledgeGraphBuildService.js'
import { createValidatedHandler, sendSuccess } from '../utils/routeHandlers.js'

const router = express.Router()

router.post(
  '/rebuild',
  createValidatedHandler({
    schema: knowledgeGraphRebuildSchema,
    routeName: 'knowledge-graph-rebuild',
    handler: async ({ data, res, requestContext }) => {
      const report = await rebuildKnowledgeGraphs({
        caseId: data.case_id,
        limit: data.limit,
        stopOnError: data.stop_on_error,
      })

      const statusCode = report.enabled ? 200 : 409
      return res.status(statusCode).json({
        success: report.enabled,
        data: report,
        meta: {
          requestId: requestContext?.requestId || null,
        },
      })
    },
  }),
)

router.post(
  '/query',
  createValidatedHandler({
    schema: knowledgeGraphQuerySchema,
    routeName: 'knowledge-graph-query',
    handler: async ({ data, res, requestContext }) => {
      const insights = await buildCaseGraphInsights({
        caseId: data.case_id,
        issue: data.issue,
        outcome: data.outcome,
        legalRule: data.legal_rule,
        side: data.side,
        limit: data.limit,
      })

      return sendSuccess(res, insights, {
        requestId: requestContext?.requestId || null,
      })
    },
  }),
)

router.post(
  '/query/pattern',
  createValidatedHandler({
    schema: knowledgeGraphPatternQuerySchema,
    routeName: 'knowledge-graph-pattern-query',
    handler: async ({ data, res, requestContext }) => {
      let result = null

      if (data.query_type === 'case_surface') {
        result = await getCaseReasoningSurface({ caseId: data.case_id })
      }
      if (data.query_type === 'unsupported_claims') {
        result = await findUnsupportedClaims({ caseId: data.case_id, limit: data.limit })
      }
      if (data.query_type === 'contradictions') {
        result = await findCaseContradictions({ caseId: data.case_id, limit: data.limit })
      }
      if (data.query_type === 'human_factors') {
        result = await findHumanFactorsAffectingSettlement({ caseId: data.case_id, limit: data.limit })
      }
      if (data.query_type === 'missing_evidence_clusters') {
        result = await findIssueClustersWithMissingEvidence({
          minCount: data.min_count,
          limit: data.limit,
        })
      }
      if (data.query_type === 'unresolved_issues') {
        result = await findUnresolvedIssuesForDebate({ caseId: data.case_id, limit: data.limit })
      }
      if (data.query_type === 'structural_similar_cases') {
        result = await findStructurallySimilarCases({ caseId: data.case_id, limit: data.limit })
      }
      if (data.query_type === 'strategy_actions') {
        result = await findStrategyActionsForWeaknesses({
          caseId: data.case_id,
          riskType: data.risk_type,
          limit: data.limit,
        })
      }

      return sendSuccess(
        res,
        {
          query_type: data.query_type,
          case_id: data.case_id,
          result,
        },
        {
          requestId: requestContext?.requestId || null,
        },
      )
    },
  }),
)

export default router
