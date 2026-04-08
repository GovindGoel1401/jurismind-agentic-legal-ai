import { env } from '../config/envConfig.js'
import {
  getCaseRecord,
  getCaseWorkflowState,
  listCaseRecords,
  updateCaseWorkflowState,
} from './caseStorageService.js'
import { buildAndStoreCaseKnowledgeGraph } from './caseKnowledgeGraphService.js'
import { logger } from '../utils/logger.js'

function normalizeStructuredCase(workflowState = {}, analysisResponse = {}) {
  return (
    workflowState?.documents?.structured_case ||
    analysisResponse?.structuredCase ||
    analysisResponse?.documents?.structured_case ||
    {}
  )
}

function buildGraphSourceState(record = {}, workflowState = {}) {
  const analysisResponse = workflowState?.analysis?.response || record?.analysisResult || {}
  const structuredCase = normalizeStructuredCase(workflowState, analysisResponse)

  return {
    caseInput: record?.caseInput || {},
    documentIntelligence:
      workflowState?.documents || analysisResponse?.documentIntelligence || {},
    graphResult: {
      ...analysisResponse,
      structuredCase,
      case_type: analysisResponse?.case_type || structuredCase?.case_type || record?.caseInput?.category || '',
      jurisdiction:
        analysisResponse?.jurisdiction || structuredCase?.jurisdiction || record?.caseInput?.jurisdiction || '',
      relevant_laws: analysisResponse?.relevant_laws || structuredCase?.possible_laws || [],
      verdict: workflowState?.verdict || analysisResponse?.verdict || {},
    },
    analysisResponse,
  }
}

async function rebuildKnowledgeGraphForCase(caseId = '') {
  const record = await getCaseRecord(caseId)
  if (!record) {
    return {
      case_id: caseId,
      success: false,
      error: 'Case not found.',
    }
  }

  const workflowState = (await getCaseWorkflowState(caseId)) || {}
  const source = buildGraphSourceState(record, workflowState)
  const knowledgeGraph = await buildAndStoreCaseKnowledgeGraph({
    caseId,
    caseInput: source.caseInput,
    graphResult: source.graphResult,
    documentIntelligence: source.documentIntelligence,
  })

  const success = Boolean(knowledgeGraph?.graph_schema?.available)

  await updateCaseWorkflowState(caseId, {
    analysis: {
      response: {
        ...source.analysisResponse,
        knowledgeGraph,
      },
      updated_at: new Date().toISOString(),
    },
    traces: {
      knowledgeGraphRebuild: {
        rebuilt_at: new Date().toISOString(),
        success,
        status: knowledgeGraph?.graph_schema?.status || 'unknown',
        nodes_written: Number(knowledgeGraph?.graph_schema?.write_counts?.nodes_written || 0),
        relationships_written: Number(
          knowledgeGraph?.graph_schema?.write_counts?.relationships_written || 0,
        ),
      },
    },
  })

  return {
    case_id: caseId,
    success,
    status: knowledgeGraph?.graph_schema?.status || 'unknown',
    nodes_written: Number(knowledgeGraph?.graph_schema?.write_counts?.nodes_written || 0),
    relationships_written: Number(
      knowledgeGraph?.graph_schema?.write_counts?.relationships_written || 0,
    ),
  }
}

export async function rebuildKnowledgeGraphs({
  caseId = '',
  limit = 25,
  stopOnError = false,
} = {}) {
  if (!env.KNOWLEDGE_GRAPH_ENABLED) {
    return {
      enabled: false,
      message: 'Knowledge graph is disabled. Set KNOWLEDGE_GRAPH_ENABLED=true.',
      processed: 0,
      successes: 0,
      failures: 0,
      results: [],
    }
  }

  const targetCaseIds = []
  if (caseId) {
    targetCaseIds.push(String(caseId))
  } else {
    const summaries = await listCaseRecords(limit)
    summaries.forEach((item) => {
      if (item?.case_id) targetCaseIds.push(String(item.case_id))
    })
  }

  const results = []
  for (const currentCaseId of targetCaseIds) {
    try {
      const outcome = await rebuildKnowledgeGraphForCase(currentCaseId)
      results.push(outcome)

      if (!outcome.success && stopOnError) {
        break
      }
    } catch (error) {
      const failed = {
        case_id: currentCaseId,
        success: false,
        error: error?.message || String(error),
      }
      results.push(failed)
      logger.warn('Knowledge graph rebuild failed for case.', failed)

      if (stopOnError) {
        break
      }
    }
  }

  const successes = results.filter((item) => item.success).length
  const failures = results.length - successes

  return {
    enabled: true,
    processed: results.length,
    successes,
    failures,
    results,
  }
}
