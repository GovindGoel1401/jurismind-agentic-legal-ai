import { env } from '../config/envConfig.js'
import {
  findCaseContradictions,
  findHumanFactorsAffectingSettlement,
  findIssueClustersWithMissingEvidence,
  findStructurallySimilarCases,
  findStrategyActionsForWeaknesses,
  findUnresolvedIssuesForDebate,
  findUnsupportedClaims,
  getCaseReasoningSurface,
} from '../graph/caseGraphQueries.js'

function emptyGraphContext(reason = 'graph_unavailable') {
  return {
    available: false,
    reason,
    graph_issue_map: [],
    graph_evidence_support_summary: {
      strongest_paths: [],
      weakest_paths: [],
    },
    graph_contradiction_summary: [],
    graph_missing_evidence_summary: [],
    graph_human_factor_summary: [],
    graph_case_structure_summary: null,
    graph_similar_pattern_summary: [],
    graph_strategy_support_summary: [],
  }
}

function asArray(value) {
  return Array.isArray(value) ? value : []
}

function summarizeIssueMap(unresolved = [], unsupported = []) {
  const combined = [
    ...asArray(unresolved).map((item) => ({
      key: item.issue_key || '',
      title: item.title || item.issue_key || '',
      summary: item.summary || '',
      weakness_signal: item.missing_count > 0 || item.support_count === 0,
      missing_count: Number(item.missing_count || 0),
      support_count: Number(item.support_count || 0),
      source: 'unresolved_issues',
    })),
    ...asArray(unsupported).map((item) => ({
      key: item.claim_key || '',
      title: item.title || item.claim_key || '',
      summary: item.summary || '',
      weakness_signal: true,
      missing_count: 0,
      support_count: 0,
      source: 'unsupported_claims',
    })),
  ]

  return combined.slice(0, 15)
}

function summarizeEvidenceSupport(issueMap = [], contradictions = [], missingClusters = []) {
  const strongestPaths = issueMap
    .filter((item) => !item.weakness_signal)
    .slice(0, 5)
    .map((item) => `${item.title}: support_count=${item.support_count}`)

  const weakestPaths = [
    ...issueMap.filter((item) => item.weakness_signal).slice(0, 6).map((item) => `${item.title}: missing=${item.missing_count}`),
    ...asArray(contradictions).slice(0, 4).map((item) => `Contradiction: ${item.label}`),
    ...asArray(missingClusters).slice(0, 4).map((item) => `Cluster gap: ${item.issue_cluster} -> ${item.missing_label}`),
  ]

  return {
    strongest_paths: strongestPaths,
    weakest_paths: weakestPaths,
  }
}

export async function buildGraphContext({ caseId = '', limit = 8 } = {}) {
  if (!env.KNOWLEDGE_GRAPH_ENABLED) {
    return emptyGraphContext('graph_disabled')
  }

  if (!caseId) {
    return emptyGraphContext('missing_case_id')
  }

  try {
    const [
      caseSurface,
      unresolvedIssues,
      unsupportedClaims,
      contradictions,
      humanFactors,
      missingEvidenceClusters,
      similarPatterns,
      strategySupport,
    ] = await Promise.all([
      getCaseReasoningSurface({ caseId }),
      findUnresolvedIssuesForDebate({ caseId, limit }),
      findUnsupportedClaims({ caseId, limit }),
      findCaseContradictions({ caseId, limit }),
      findHumanFactorsAffectingSettlement({ caseId, limit }),
      findIssueClustersWithMissingEvidence({ minCount: 2, limit }),
      findStructurallySimilarCases({ caseId, limit }),
      findStrategyActionsForWeaknesses({ caseId, limit }),
    ])

    const issueMap = summarizeIssueMap(unresolvedIssues, unsupportedClaims)

    return {
      available: true,
      reason: 'ok',
      graph_issue_map: issueMap,
      graph_evidence_support_summary: summarizeEvidenceSupport(
        issueMap,
        contradictions,
        missingEvidenceClusters,
      ),
      graph_contradiction_summary: asArray(contradictions).slice(0, 12),
      graph_missing_evidence_summary: asArray(missingEvidenceClusters).slice(0, 12),
      graph_human_factor_summary: asArray(humanFactors).slice(0, 12),
      graph_case_structure_summary: caseSurface,
      graph_similar_pattern_summary: asArray(similarPatterns).slice(0, 12),
      graph_strategy_support_summary: asArray(strategySupport).slice(0, 12),
    }
  } catch (error) {
    return {
      ...emptyGraphContext('graph_query_failed'),
      error: error?.message || String(error),
    }
  }
}
