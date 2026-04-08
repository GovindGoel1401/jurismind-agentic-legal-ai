import { runAgentGraph } from '../langgraph/agentGraph.js'
import { buildAnalyzeCaseResponse } from './analysisResponseService.js'
import { buildCaseAnalysisAssessment } from './caseAnalysisAssessmentService.js'
import { runCaseInterpreter } from '../agents/caseInterpreter.js'
import { buildDocumentIntelligence } from './documentIntelligence/documentIntelligenceService.js'
import { buildFeedbackLearningProfile } from './feedbackLearningService.js'
import { buildSimilarCaseIntelligence } from './similarCaseIntelligenceService.js'
import { composeVerdictStudioResult } from './verdictStudioService.js'
import { retrieveSimilarCases } from '../rag/retriever.js'
import { buildAndStoreCaseKnowledgeGraph } from './caseKnowledgeGraphService.js'
import { buildCaseGraphInsights } from '../graph/caseGraphQueries.js'
import { indexUserCaseEvidence } from './ingestion/userEvidenceIndexingService.js'
import { buildRetrievalQueries } from './retrievalQueryService.js'
import { env } from '../config/envConfig.js'
import { buildWorkflowIntakeState, normalizeCaseInput } from './caseWorkflowStateService.js'
import { buildGraphContext } from './graphContextBuilderService.js'

function buildDisabledKnowledgeGraph() {
  return {
    graph_schema: {
      available: false,
      status: 'disabled',
      node_counts: {
        issues: 0,
        arguments: 0,
        evidence: 0,
        legal_rules: 0,
        reasoning: 0,
        outcomes: 0,
      },
      write_counts: {
        nodes_written: 0,
        relationships_written: 0,
      },
    },
    graph_extraction: {},
    graph_example: {},
    graph_insights: {
      available: false,
      similar_cases: [],
      arguments: [],
      reasoning_paths: [],
    },
    graph_meta: {
      extraction_source: 'disabled',
      extraction_model: null,
    },
  }
}

function buildSkippedEvidenceIndexing(reason = 'case_id_unavailable') {
  return {
    indexed: false,
    reason,
    indexed_documents: 0,
  }
}

export function normalizeCaseInputPayload(payload = {}) {
  return normalizeCaseInput({
    ...payload,
    description: payload.description || payload.caseText || '',
  })
}

export async function runDocumentIntelligenceStage(caseInput = {}) {
  let structuredCase = {}
  try {
    const interpreted = await runCaseInterpreter(caseInput)
    structuredCase = interpreted?.structuredCase || {}
  } catch {
    structuredCase = {}
  }

  const documentIntelligence = buildDocumentIntelligence(caseInput, {
    structuredCase,
  })

  return {
    caseInput,
    structuredCase,
    documentIntelligence,
  }
}

export async function runSimilarCasesStage({
  caseId = '',
  caseInput = {},
  structuredCase = {},
  documentIntelligence = {},
  caseAssessment = {},
  topK = 5,
}) {
  const rewrittenQueries = await buildRetrievalQueries({
    userQuery: caseInput.description,
    goal: 'similar_cases',
    caseInput,
    structuredCase,
  })
  const similarCasesQuery = rewrittenQueries.similarCasesQuery || caseInput.description

  const [retrievedCases, graphInsights] = await Promise.all([
    retrieveSimilarCases(similarCasesQuery, topK),
    env.KNOWLEDGE_GRAPH_ENABLED
      ? buildCaseGraphInsights({
          caseId,
          issue:
            structuredCase?.claims?.[0] ||
            structuredCase?.case_type ||
            caseInput?.category ||
            caseInput.description,
          legalRule: structuredCase?.relevant_laws?.[0] || '',
          limit: topK,
        })
      : Promise.resolve({
          available: false,
          similar_cases: [],
          arguments: [],
          reasoning_paths: [],
        }),
  ])

  const similarCaseIntelligence = buildSimilarCaseIntelligence({
    currentCase: caseInput,
    documentIntelligence,
    caseAssessment,
    retrievedCases,
    graphInsights,
  })

  return {
    rewrittenQueries,
    similarCasesQuery,
    retrievedCases,
    graphInsights,
    similarCaseIntelligence,
  }
}

export async function runAnalyzeCaseWorkflow({
  caseInput = {},
  caseId = '',
  createdAt = new Date().toISOString(),
}) {
  const normalizedCaseInput = normalizeCaseInputPayload(caseInput)
  const { structuredCase, documentIntelligence } = await runDocumentIntelligenceStage(normalizedCaseInput)
  const feedbackLearning = await buildFeedbackLearningProfile(normalizedCaseInput)
  const graphResult = await runAgentGraph({
    caseId,
    caseInput: normalizedCaseInput,
    feedbackLearning,
  })

  if (!graphResult?.structuredCase && Object.keys(structuredCase).length) {
    graphResult.structuredCase = structuredCase
  }

  const resolvedStructuredCase = graphResult?.structuredCase || structuredCase || {}
  const caseAssessment = buildCaseAnalysisAssessment(
    graphResult,
    documentIntelligence,
    normalizedCaseInput,
  )
  const similarCasesStage = await runSimilarCasesStage({
    caseId,
    caseInput: normalizedCaseInput,
    structuredCase: resolvedStructuredCase,
    documentIntelligence,
    caseAssessment,
  })

  const verdict = composeVerdictStudioResult({
    caseInput: normalizedCaseInput,
    graphResult,
    caseAssessment,
    documentIntelligence,
    similarCaseIntelligence: similarCasesStage.similarCaseIntelligence,
    feedbackLearning,
  })

  graphResult.similarCaseIntelligence = similarCasesStage.similarCaseIntelligence
  graphResult.retrievalQueryRewrite = similarCasesStage.rewrittenQueries
  graphResult.verdict = verdict
  graphResult.final_verdict = verdict
  graphResult.verdictMeta = verdict.verdictMeta

  const knowledgeGraph =
    env.KNOWLEDGE_GRAPH_ENABLED && caseId
      ? await buildAndStoreCaseKnowledgeGraph({
          caseId,
          caseInput: normalizedCaseInput,
          graphResult,
          documentIntelligence,
        })
      : buildDisabledKnowledgeGraph()

  const graphContext = env.KNOWLEDGE_GRAPH_ENABLED
    ? await buildGraphContext({ caseId, limit: 8 })
    : {
        available: false,
        reason: 'graph_disabled',
      }

  const evidenceIndexing = caseId
    ? await indexUserCaseEvidence({
        caseId,
        caseInput: normalizedCaseInput,
        documentIntelligence,
      })
    : buildSkippedEvidenceIndexing()

  graphResult.knowledgeGraph = knowledgeGraph
  graphResult.graph_context = graphContext
  graphResult.evidenceIndexing = evidenceIndexing

  const analysisResponse = {
    ...buildAnalyzeCaseResponse(
      graphResult,
      feedbackLearning,
      documentIntelligence,
      caseAssessment,
      similarCasesStage.similarCaseIntelligence,
    ),
    knowledgeGraph,
    graph_context: graphContext,
    evidenceIndexing,
    caseMeta: {
      case_id: caseId,
      created_at: createdAt,
    },
  }

  return {
    caseInput: normalizedCaseInput,
    documentIntelligence,
    feedbackLearning,
    caseAssessment,
    similarCaseIntelligence: similarCasesStage.similarCaseIntelligence,
    verdict,
    graphResult,
    rewrittenQueries: similarCasesStage.rewrittenQueries,
    similarCasesQuery: similarCasesStage.similarCasesQuery,
    graphInsights: similarCasesStage.graphInsights,
    knowledgeGraph,
    evidenceIndexing,
    analysisResponse,
  }
}

export function buildDocumentWorkflowPatch({
  caseInput = {},
  caseId = '',
  structuredCase = {},
  documentIntelligence = {},
}) {
  return {
    intake: buildWorkflowIntakeState(caseInput, caseId),
    documents: {
      ...documentIntelligence,
      structured_case: structuredCase,
    },
  }
}

export function buildAnalysisWorkflowPatch({
  caseInput = {},
  caseId = '',
  documentIntelligence = {},
  structuredCase = {},
  analysisResponse = {},
  feedbackLearning = {},
  caseAssessment = {},
  verdict = {},
  similarCaseIntelligence = {},
  rewrittenQueries = {},
  similarCasesQuery = '',
}) {
  return {
    intake: buildWorkflowIntakeState(caseInput, caseId),
    documents: {
      ...documentIntelligence,
      structured_case: structuredCase,
    },
    analysis: {
      response: analysisResponse,
      case_assessment: caseAssessment,
      feedback_learning: feedbackLearning,
      updated_at: new Date().toISOString(),
    },
    verdict,
    similar_cases: {
      last_query: similarCasesQuery,
      result: {
        ...similarCaseIntelligence,
        retrievalQueryRewrite: rewrittenQueries,
      },
      updated_at: new Date().toISOString(),
    },
    traces: {
      pipelineTrace: analysisResponse.pipelineTrace || [],
      pipelineMeta: analysisResponse.pipelineMeta || {},
      retrievalQueryRewrite: rewrittenQueries,
    },
  }
}
