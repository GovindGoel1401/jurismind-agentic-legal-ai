import { embedCaseText } from '../rag/embeddingService.js'
import { buildLegalResearchResult } from './legalResearchResultService.js'
import {
  getConditionalRetrievedContext,
  routeRetrievalNeed,
} from './retrievalRoutingService.js'
import { buildCaseGraphInsights } from '../graph/caseGraphQueries.js'
import { buildRetrievalQueries } from './retrievalQueryService.js'
import { env } from '../config/envConfig.js'
import { buildGraphContext } from './graphContextBuilderService.js'

async function timed(fn) {
  const startedAt = Date.now()
  const result = await fn()
  return {
    durationMs: Date.now() - startedAt,
    result,
  }
}

export async function runLegalResearchWorkflow(state) {
  const caseText = state?.caseInput?.description || ''
  const rewriteStep = await timed(() =>
    buildRetrievalQueries({
      userQuery: caseText,
      goal: 'legal_research',
      caseInput: state?.caseInput || {},
      structuredCase: state?.structuredCase || {},
      recentTurns: state?.sessionMemory?.answer_history || [],
      workingState: state?.sessionMemory?.working_state || {},
    }),
  )
  const retrievalQuery = rewriteStep.result.retrievalQuery || caseText
  const feedbackHints = state?.feedbackLearning?.commonMissedSections || []
  const routingStep = await timed(() =>
    routeRetrievalNeed({
      queryText: retrievalQuery,
      state,
      stage: 'legal_research',
    }),
  )
  const shouldRetrieve = routingStep.result.no_retrieval !== 'YES'

  const embeddingStep = shouldRetrieve
    ? await timed(() => embedCaseText(retrievalQuery))
    : {
        durationMs: 0,
        result: [],
      }
  const retrievalStep = shouldRetrieve
    ? await timed(() =>
        getConditionalRetrievedContext({
          routing: routingStep.result,
          queryText: retrievalQuery,
          state,
          vector: embeddingStep.result,
          rewrittenQueries: rewriteStep.result,
        }),
      )
    : {
        durationMs: 0,
        result: await getConditionalRetrievedContext({
          routing: routingStep.result,
          queryText: retrievalQuery,
          state,
          vector: [],
          rewrittenQueries: rewriteStep.result,
        }),
      }
  const graphInsightsStep = env.KNOWLEDGE_GRAPH_ENABLED
    ? await timed(() =>
        buildCaseGraphInsights({
          caseId: state?.caseId || state?.case_id || '',
          issue:
            state?.structuredCase?.claims?.[0] ||
            state?.structuredCase?.case_type ||
            state?.caseInput?.category ||
            '',
          legalRule: state?.structuredCase?.possible_laws?.[0] || '',
          limit: 5,
        }),
      )
    : {
        durationMs: 0,
        result: {
          available: false,
          similar_cases: [],
          arguments: [],
          reasoning_paths: [],
        },
      }

  const graphContextStep = env.KNOWLEDGE_GRAPH_ENABLED
    ? await timed(() => buildGraphContext({ caseId: state?.caseId || state?.case_id || '', limit: 6 }))
    : {
        durationMs: 0,
        result: {
          available: false,
          reason: 'graph_disabled',
        },
      }

  return buildLegalResearchResult({
    embedding: shouldRetrieve ? embeddingStep.result : [],
    routing: routingStep.result,
    retrievedContext: retrievalStep.result,
    graphInsights: graphInsightsStep.result,
    feedbackSummary: state?.feedbackLearning?.summary || '',
    feedbackHints,
    workflowMeta: {
      queryLength: caseText.length,
      rewrittenQuery: retrievalQuery,
      feedbackHintCount: feedbackHints.length,
      strategy: retrievalStep.result.mode === 'none' ? 'no_retrieval' : retrievalStep.result.mode,
      stepDurations: {
        queryRewriteMs: rewriteStep.durationMs,
        routingMs: routingStep.durationMs,
        embeddingMs: embeddingStep.durationMs,
        conditionalRetrievalMs: retrievalStep.durationMs,
        graphInsightsMs: graphInsightsStep.durationMs,
        graphContextMs: graphContextStep.durationMs,
      },
      routing: routingStep.result,
      retrievalDebug: retrievalStep.result.debug,
      graphContext: graphContextStep.result,
    },
  })
}
