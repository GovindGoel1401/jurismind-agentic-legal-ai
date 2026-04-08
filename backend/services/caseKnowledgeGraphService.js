import { runKnowledgeGraphExtractorAgent } from '../agents/knowledgeGraphExtractorAgent.js'
import { upsertCaseKnowledgeGraph } from '../graph/caseGraphRepository.js'
import { buildCaseGraphInsights } from '../graph/caseGraphQueries.js'
import { logger } from '../utils/logger.js'

function deriveIssueQuery(graphExtraction = {}, graphResult = {}, caseInput = {}) {
  return (
    graphExtraction?.issues?.[0]?.title ||
    graphResult?.structuredCase?.claims?.[0] ||
    graphResult?.case_type ||
    caseInput?.category ||
    ''
  )
}

function buildGraphSchemaSummary(
  graphExtraction = {},
  graphResult = {},
  documentIntelligence = {},
  persistResult = {},
) {
  const structuredSynthesis = graphResult?.structured_synthesis || {}
  const humanFactors = graphResult?.human_factors || {}

  return {
    available: Boolean(persistResult?.available),
    status: persistResult?.reason || 'unknown',
    node_counts: {
      issues: (graphExtraction.issues || []).length,
      claims: (graphResult?.structuredCase?.claims || []).length,
      defenses: (graphExtraction.arguments || []).filter((item) => item.side === 'opposing').length,
      arguments: (graphExtraction.arguments || []).length,
      parties: (graphResult?.structuredCase?.entities || []).length,
      facts:
        (graphResult?.caseAssessment?.support_points || []).length +
        (graphResult?.caseAssessment?.weakness_points || []).length,
      events: (documentIntelligence?.timeline_events || []).length,
      evidence: (graphExtraction.evidence_items || []).length,
      legal_rules: (graphExtraction.legal_rules || []).length,
      risks:
        (graphResult?.caseAssessment?.weakness_points || []).length +
        (graphResult?.verdict?.uncertainty_flags || []).length,
      contradictions: (graphResult?.caseAssessment?.contradiction_points || []).length,
      missing_evidence:
        (documentIntelligence?.missing_documents || []).length +
        (graphResult?.caseAssessment?.missing_document_impact || []).length,
      human_factors:
        (structuredSynthesis?.emotional_signal_findings || []).length +
        (humanFactors?.signals || []).length,
      strategy_actions:
        (graphResult?.caseAssessment?.recommendations || []).length +
        (graphResult?.verdict?.improvement_actions || []).length,
      outcomes: graphExtraction?.outcome ? 1 : 0,
    },
    write_counts: {
      nodes_written: persistResult?.nodes_written || 0,
      relationships_written: persistResult?.relationships_written || 0,
    },
  }
}

export function buildGraphExample(graphExtraction = {}, caseId = '') {
  return {
    case: {
      case_id: caseId,
      summary: graphExtraction?.case_summary || 'Case summary unavailable.',
    },
    sample_path: {
      issue: graphExtraction?.issues?.[0]?.title || 'Issue unavailable',
      argument: graphExtraction?.arguments?.[0]?.title || 'Argument unavailable',
      evidence: graphExtraction?.evidence_items?.[0]?.label || 'Evidence unavailable',
      legal_rule: graphExtraction?.legal_rules?.[0]?.label || 'Rule unavailable',
      outcome: graphExtraction?.outcome?.label || 'Outcome unavailable',
    },
  }
}

export async function buildAndStoreCaseKnowledgeGraph({
  caseId,
  caseInput = {},
  graphResult = {},
  documentIntelligence = {},
}) {
  try {
    const extractionResult = await runKnowledgeGraphExtractorAgent({
      caseId,
      caseInput,
      graphResult,
      documentIntelligence,
    })
    const graphExtraction = extractionResult.graphExtraction || {}
    const persistResult = await upsertCaseKnowledgeGraph({
      caseId,
      caseInput,
      graphExtraction,
      graphResult,
      documentIntelligence,
    })
    const issueQuery = deriveIssueQuery(graphExtraction, graphResult, caseInput)
    const graphInsights = await buildCaseGraphInsights({
      caseId,
      issue: issueQuery,
      legalRule: graphExtraction?.legal_rules?.[0]?.label || graphResult?.relevant_laws?.[0] || '',
      limit: 5,
    })

    return {
      graph_schema: buildGraphSchemaSummary(
        graphExtraction,
        graphResult,
        documentIntelligence,
        persistResult,
      ),
      graph_extraction: graphExtraction,
      graph_example: buildGraphExample(graphExtraction, caseId),
      graph_insights: graphInsights,
      graph_meta: {
        extraction_source: extractionResult?.graphExtractionMeta?.source || 'unknown',
        extraction_model: extractionResult?.graphExtractionMeta?.model || null,
      },
    }
  } catch (error) {
    logger.warn('Case knowledge graph pipeline failed.', {
      caseId,
      message: error?.message || String(error),
    })

    return {
      graph_schema: {
        available: false,
        status: 'graph_pipeline_failed',
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
      graph_example: buildGraphExample({}, caseId),
      graph_insights: {
        available: false,
        similar_cases: [],
        arguments: [],
        reasoning_paths: [],
      },
      graph_meta: {
        extraction_source: 'failed',
        extraction_model: null,
      },
    }
  }
}
