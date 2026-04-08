import express from 'express'
import { similarCasesSchema } from '../models/requestSchemas.js'
import { retrieveSimilarCases } from '../rag/retriever.js'
import { buildSimilarCaseIntelligence } from '../services/similarCaseIntelligenceService.js'
import { buildCaseGraphInsights } from '../graph/caseGraphQueries.js'
import { buildRetrievalQueries } from '../services/retrievalQueryService.js'
import { createValidatedHandler, sendSuccess } from '../utils/routeHandlers.js'
import { env } from '../config/envConfig.js'

const router = express.Router()

router.post(
  '/',
  createValidatedHandler({
    schema: similarCasesSchema,
    routeName: 'similar-cases',
    handler: async ({ data, res, requestContext }) => {
      const { query, topK, category, jurisdiction, document_intelligence, case_assessment } = data
      const rewrittenQueries = await buildRetrievalQueries({
        userQuery: query,
        goal: 'similar_cases',
        caseInput: {
          description: query,
          category,
          jurisdiction,
        },
      })
      const similarCasesQuery = rewrittenQueries.similarCasesQuery || query
      const [cases, graphInsights] = await Promise.all([
        retrieveSimilarCases(similarCasesQuery, topK),
        env.KNOWLEDGE_GRAPH_ENABLED
          ? buildCaseGraphInsights({
              issue: similarCasesQuery,
              limit: topK,
            })
          : Promise.resolve({
              available: false,
              similar_cases: [],
              arguments: [],
              reasoning_paths: [],
            }),
      ])
      const intelligence = buildSimilarCaseIntelligence({
        currentCase: {
          query,
          description: query,
          category,
          jurisdiction,
        },
        documentIntelligence: document_intelligence,
        caseAssessment: case_assessment,
        retrievedCases: cases,
        graphInsights,
      })

      return sendSuccess(res, {
        ...intelligence,
        retrievalQueryRewrite: rewrittenQueries,
      }, {
        requestId: requestContext?.requestId || null,
      })
    },
  }),
)

export default router
