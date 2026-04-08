import neo4j from 'neo4j-driver'
import { getNeo4jDriver } from './neo4jClient.js'
import { logger } from '../utils/logger.js'
import { env } from '../config/envConfig.js'
import { ensureLegalGraphSchema } from './graphSchemaSetup.js'

function emptyGraphInsights() {
  return {
    available: false,
    similar_cases: [],
    arguments: [],
    reasoning_paths: [],
    unresolved_issues: [],
    contradiction_hotspots: [],
    missing_evidence_clusters: [],
  }
}

function toNumber(value, fallback = 0) {
  if (value && typeof value?.toNumber === 'function') {
    const numeric = value.toNumber()
    return Number.isFinite(numeric) ? numeric : fallback
  }

  const numeric = Number(value)
  return Number.isFinite(numeric) ? numeric : fallback
}

export function normalizeNonNegativeInt(value, fallback = 0, label = 'graph-query-param') {
  const rawValue = value
  const numeric = Number(value)
  const normalizedValue =
    Number.isFinite(numeric) && numeric >= 0 ? Math.floor(numeric) : Math.max(0, Math.floor(Number(fallback) || 0))

  logger.info('[Graph] Normalized Neo4j integer parameter.', {
    label,
    rawValue,
    normalizedValue,
  })

  return normalizedValue
}

function toNeo4jInt(value, fallback = 0, label = 'graph-query-param') {
  return neo4j.int(normalizeNonNegativeInt(value, fallback, label))
}

async function withSession(executor) {
  const driver = getNeo4jDriver()
  if (!driver) return null

  const session = driver.session()
  try {
    await ensureLegalGraphSchema(session)
    return await executor(session)
  } finally {
    await session.close()
  }
}

export async function getCaseReasoningSurface({ caseId }) {
  if (!caseId) return null

  return withSession(async (session) => {
    const result = await session.run(
      `
        MATCH (c:Case {case_id: $caseId})
        OPTIONAL MATCH (c)-[:RAISES_ISSUE]->(i:Issue)
        OPTIONAL MATCH (c)-[:HAS_CLAIM]->(cl:Claim)
        OPTIONAL MATCH (c)-[:HAS_EVIDENCE]->(e:Evidence)
        OPTIONAL MATCH (c)-[:HAS_RISK]->(r:RiskFactor)
        RETURN c.case_id AS case_id,
               c.summary AS case_summary,
               collect(DISTINCT i.title)[0..12] AS issues,
               collect(DISTINCT cl.title)[0..12] AS claims,
               collect(DISTINCT e.label)[0..12] AS evidence,
               collect(DISTINCT r.label)[0..12] AS risks
      `,
      { caseId },
    )

    const record = result.records[0]
    if (!record) return null

    return {
      case_id: record.get('case_id'),
      case_summary: record.get('case_summary') || '',
      issues: record.get('issues') || [],
      claims: record.get('claims') || [],
      evidence: record.get('evidence') || [],
      risks: record.get('risks') || [],
    }
  })
}

export async function findUnsupportedClaims({ caseId, limit = 10 }) {
  if (!caseId) return []

  return withSession(async (session) => {
    const result = await session.run(
      `
        MATCH (c:Case {case_id: $caseId})-[:HAS_CLAIM]->(cl:Claim)
        OPTIONAL MATCH (:Evidence)-[:SUPPORTS_CLAIM]->(cl)
        WITH cl, count(*) AS support_count
        WHERE support_count = 0
        RETURN cl.claim_key AS claim_key,
               cl.title AS title,
               cl.summary AS summary
        LIMIT $limit
      `,
      {
        caseId,
        limit: toNeo4jInt(limit, 10, 'findUnsupportedClaims.limit'),
      },
    )

    return result.records.map((record) => ({
      claim_key: record.get('claim_key'),
      title: record.get('title'),
      summary: record.get('summary') || '',
    }))
  })
}

export async function findCaseContradictions({ caseId, limit = 10 }) {
  if (!caseId) return []

  return withSession(async (session) => {
    const result = await session.run(
      `
        MATCH (c:Case {case_id: $caseId})-[:HAS_CONTRADICTION]->(k:Contradiction)
        OPTIONAL MATCH (k)-[:INVOLVES_FACT]->(f:Fact)
        OPTIONAL MATCH (k)-[:INVOLVES_EVENT]->(e:Event)
        RETURN k.contradiction_key AS contradiction_key,
               k.label AS label,
               k.summary AS summary,
               k.severity AS severity,
               collect(DISTINCT f.statement)[0..6] AS fact_signals,
               collect(DISTINCT e.title)[0..6] AS event_signals
        ORDER BY k.severity DESC
        LIMIT $limit
      `,
      {
        caseId,
        limit: toNeo4jInt(limit, 10, 'findCaseContradictions.limit'),
      },
    )

    return result.records.map((record) => ({
      contradiction_key: record.get('contradiction_key'),
      label: record.get('label'),
      summary: record.get('summary') || '',
      severity: record.get('severity') || 'unknown',
      fact_signals: record.get('fact_signals') || [],
      event_signals: record.get('event_signals') || [],
    }))
  })
}

export async function findHumanFactorsAffectingSettlement({ caseId, limit = 10 }) {
  if (!caseId) return []

  return withSession(async (session) => {
    const result = await session.run(
      `
        MATCH (c:Case {case_id: $caseId})-[:HAS_HUMAN_FACTOR]->(h:HumanFactor)
        OPTIONAL MATCH (h)-[:INFLUENCES_SETTLEMENT]->(p:OutcomePattern)
        RETURN h.human_factor_key AS factor_key,
               h.factor_type AS factor_type,
               h.summary AS summary,
               h.intensity AS intensity,
               collect(DISTINCT p.pattern_key)[0..3] AS linked_patterns
        ORDER BY h.intensity DESC
        LIMIT $limit
      `,
      {
        caseId,
        limit: toNeo4jInt(limit, 10, 'findHumanFactorsAffectingSettlement.limit'),
      },
    )

    return result.records.map((record) => ({
      factor_key: record.get('factor_key'),
      factor_type: record.get('factor_type'),
      summary: record.get('summary') || '',
      intensity: toNumber(record.get('intensity'), 0),
      linked_patterns: record.get('linked_patterns') || [],
    }))
  })
}

export async function findIssueClustersWithMissingEvidence({ minCount = 2, limit = 10 }) {
  return withSession(async (session) => {
    const result = await session.run(
      `
        MATCH (m:MissingEvidence)-[:AFFECTS_ISSUE]->(i:Issue)
        WITH i.normalized_issue AS issue_cluster, m.label AS missing_label, count(*) AS freq
        WHERE freq >= $minCount
        RETURN issue_cluster, missing_label, freq
        ORDER BY freq DESC
        LIMIT $limit
      `,
      {
        minCount: toNeo4jInt(minCount, 2, 'findIssueClustersWithMissingEvidence.minCount'),
        limit: toNeo4jInt(limit, 10, 'findIssueClustersWithMissingEvidence.limit'),
      },
    )

    return result.records.map((record) => ({
      issue_cluster: record.get('issue_cluster') || '',
      missing_label: record.get('missing_label') || '',
      frequency: toNumber(record.get('freq'), 0),
    }))
  })
}

export async function findUnresolvedIssuesForDebate({ caseId, limit = 10 }) {
  if (!caseId) return []

  return withSession(async (session) => {
    const result = await session.run(
      `
        MATCH (c:Case {case_id: $caseId})-[:RAISES_ISSUE]->(i:Issue)
         OPTIONAL MATCH (e:Evidence)-[:SUPPORTS_ISSUE]->(i)
        OPTIONAL MATCH (m:MissingEvidence)-[:AFFECTS_ISSUE]->(i)
        WITH i,
             count(DISTINCT m) AS missing_count,
           count(DISTINCT e) AS support_count
        WHERE missing_count > 0 OR support_count = 0
        RETURN i.issue_key AS issue_key,
               i.title AS title,
               i.summary AS summary,
               missing_count,
               support_count
        ORDER BY missing_count DESC
        LIMIT $limit
      `,
      {
        caseId,
        limit: toNeo4jInt(limit, 10, 'findUnresolvedIssuesForDebate.limit'),
      },
    )

    return result.records.map((record) => ({
      issue_key: record.get('issue_key'),
      title: record.get('title') || '',
      summary: record.get('summary') || '',
      missing_count: toNumber(record.get('missing_count'), 0),
      support_count: toNumber(record.get('support_count'), 0),
    }))
  })
}

export async function findStructurallySimilarCases({ caseId, limit = 5 }) {
  if (!caseId) return []

  return withSession(async (session) => {
    const result = await session.run(
      `
        MATCH (seed:Case {case_id: $caseId})-[:RAISES_ISSUE]->(i:Issue)
        WITH seed, collect(DISTINCT i.normalized_issue) AS seed_issues
        MATCH (seed)-[:HAS_RISK]->(r:RiskFactor)
        WITH seed, seed_issues, collect(DISTINCT r.risk_type) AS seed_risks
        MATCH (seed)-[:HAS_MISSING_EVIDENCE]->(m:MissingEvidence)
        WITH seed, seed_issues, seed_risks, collect(DISTINCT m.label) AS seed_missing
        MATCH (other:Case)
        WHERE other.case_id <> seed.case_id
        OPTIONAL MATCH (other)-[:RAISES_ISSUE]->(oi:Issue)
        OPTIONAL MATCH (other)-[:HAS_RISK]->(orisk:RiskFactor)
        OPTIONAL MATCH (other)-[:HAS_MISSING_EVIDENCE]->(om:MissingEvidence)
        WITH other, seed_issues, seed_risks, seed_missing,
             collect(DISTINCT oi.normalized_issue) AS other_issues,
             collect(DISTINCT orisk.risk_type) AS other_risks,
             collect(DISTINCT om.label) AS other_missing
        WITH other,
             size([x IN other_issues WHERE x IN seed_issues]) AS issue_overlap,
             size([x IN other_risks WHERE x IN seed_risks]) AS risk_overlap,
             size([x IN other_missing WHERE x IN seed_missing]) AS missing_overlap
        RETURN other.case_id AS case_id,
               issue_overlap,
               risk_overlap,
               missing_overlap,
               (issue_overlap * 2 + risk_overlap + missing_overlap) AS structural_score
        ORDER BY structural_score DESC
        LIMIT $limit
      `,
      {
        caseId,
        limit: toNeo4jInt(limit, 5, 'findStructurallySimilarCases.limit'),
      },
    )

    return result.records.map((record) => ({
      case_id: record.get('case_id'),
      issue_overlap: toNumber(record.get('issue_overlap'), 0),
      risk_overlap: toNumber(record.get('risk_overlap'), 0),
      missing_overlap: toNumber(record.get('missing_overlap'), 0),
      structural_score: toNumber(record.get('structural_score'), 0),
    }))
  })
}

export async function findStrategyActionsForWeaknesses({ caseId, riskType = '', limit = 10 }) {
  if (!caseId) return []

  return withSession(async (session) => {
    const result = await session.run(
      `
        MATCH (c:Case {case_id: $caseId})-[:HAS_STRATEGY_ACTION]->(s:StrategyAction)
        OPTIONAL MATCH (s)-[:ADDRESSES_RISK]->(r:RiskFactor)
        OPTIONAL MATCH (s)-[:ADDRESSES_MISSING_EVIDENCE]->(m:MissingEvidence)
        WITH s, collect(DISTINCT r) AS risks, collect(DISTINCT m) AS missing
        WHERE $riskType = '' OR any(item IN risks WHERE toLower(item.risk_type) = toLower($riskType))
        RETURN s.strategy_key AS strategy_key,
               s.action AS action,
               s.reason AS reason,
               [item IN risks | item.label] AS addressed_risks,
               [item IN missing | item.label] AS addressed_missing_evidence,
               s.confidence_score AS confidence_score
        ORDER BY s.confidence_score DESC
        LIMIT $limit
      `,
      {
        caseId,
        riskType,
        limit: toNeo4jInt(limit, 10, 'findStrategyActionsForWeaknesses.limit'),
      },
    )

    return result.records.map((record) => ({
      strategy_key: record.get('strategy_key'),
      action: record.get('action') || '',
      reason: record.get('reason') || '',
      addressed_risks: record.get('addressed_risks') || [],
      addressed_missing_evidence: record.get('addressed_missing_evidence') || [],
      confidence_score: toNumber(record.get('confidence_score'), 0),
    }))
  })
}

export async function findCasesByIssueAndOutcome({ issue = '', outcome = '', limit = 5 }) {
  if (!issue) return []

  return withSession(async (session) => {
    const result = await session.run(
      `
        MATCH (c:Case)-[:RAISES_ISSUE]->(i:Issue)
        OPTIONAL MATCH (c)-[:MATCHES_PATTERN]->(p:OutcomePattern)
        WHERE (
          toLower(i.title) CONTAINS toLower($issue)
          OR toLower(i.summary) CONTAINS toLower($issue)
          OR toLower(c.summary) CONTAINS toLower($issue)
        )
          AND ($outcome = '' OR toLower(p.outcome_tendency) CONTAINS toLower($outcome))
        RETURN c.case_id AS case_id,
               c.summary AS case_summary,
               i.title AS issue_title,
               p.outcome_tendency AS outcome_label,
               count(i) AS overlap
        ORDER BY overlap DESC
        LIMIT $limit
      `,
      {
        issue,
        outcome,
        limit: toNeo4jInt(limit, 5, 'findCasesByIssueAndOutcome.limit'),
      },
    )

    return result.records.map((record) => ({
      case_id: record.get('case_id'),
      case_summary: record.get('case_summary') || '',
      issue_title: record.get('issue_title') || '',
      outcome_label: record.get('outcome_label') || 'Outcome uncertain',
      overlap_score: toNumber(record.get('overlap'), 1),
    }))
  })
}

export async function findArgumentsForIssue({ issue = '', side = '', limit = 6 }) {
  if (!issue) return []

  return withSession(async (session) => {
    const result = await session.run(
      `
        MATCH (c:Case)
        OPTIONAL MATCH (c)-[:HAS_CLAIM]->(claim:Claim)-[:RELATES_TO_ISSUE]->(i:Issue)
        OPTIONAL MATCH (c)-[:HAS_DEFENSE]->(defense:Defense)-[:RELATES_TO_ISSUE]->(i)
        OPTIONAL MATCH (e:Evidence)-[:SUPPORTS_CLAIM]->(claim)
        OPTIONAL MATCH (r:LegalRule)<-[:TRIGGERS_RULE]-(i)
        WHERE toLower(i.title) CONTAINS toLower($issue) OR toLower(i.summary) CONTAINS toLower($issue)
        WITH c, i,
             collect(DISTINCT {
               title: claim.title,
               summary: claim.summary,
               side: 'supporting'
             }) + collect(DISTINCT {
               title: defense.title,
               summary: defense.summary,
               side: 'opposing'
             }) AS positions,
             collect(DISTINCT e.label) AS evidence_labels,
             collect(DISTINCT r.label) AS legal_rules
        UNWIND positions AS p
        WITH c, p, evidence_labels, legal_rules
        WHERE p.title IS NOT NULL AND ($side = '' OR p.side = $side)
        RETURN c.case_id AS case_id,
               p.title AS title,
               p.summary AS summary,
               p.side AS side,
               evidence_labels,
               legal_rules
        LIMIT $limit
      `,
      {
        issue,
        side,
        limit: toNeo4jInt(limit, 6, 'findArgumentsForIssue.limit'),
      },
    )

    return result.records.map((record) => ({
      case_id: record.get('case_id'),
      title: record.get('title') || '',
      summary: record.get('summary') || '',
      side: record.get('side') || '',
      evidence_labels: record.get('evidence_labels') || [],
      legal_rules: record.get('legal_rules') || [],
    }))
  })
}

export async function findReasoningTraversal({ issue = '', legalRule = '', limit = 5 }) {
  if (!issue && !legalRule) return []

  return withSession(async (session) => {
    const result = await session.run(
      `
        MATCH (c:Case)-[:RAISES_ISSUE]->(i:Issue)
        OPTIONAL MATCH (i)-[:TRIGGERS_RULE]->(r:LegalRule)
        OPTIONAL MATCH (c)-[:MATCHES_PATTERN]->(p:OutcomePattern)
        WHERE ($issue = '' OR toLower(i.title) CONTAINS toLower($issue) OR toLower(i.summary) CONTAINS toLower($issue))
          AND ($legalRule = '' OR toLower(r.label) CONTAINS toLower($legalRule))
        RETURN c.case_id AS case_id,
               i.title AS issue_title,
               ('Issue-rule linkage for ' + coalesce(i.title, 'issue')) AS reasoning_title,
               ('Issue to rule traversal via ' + coalesce(r.label, 'rule unavailable')) AS reasoning_summary,
               p.outcome_tendency AS outcome_label,
               collect(DISTINCT r.label) AS legal_rules
        LIMIT $limit
      `,
      {
        issue,
        legalRule,
        limit: toNeo4jInt(limit, 5, 'findReasoningTraversal.limit'),
      },
    )

    return result.records.map((record) => ({
      case_id: record.get('case_id'),
      issue_title: record.get('issue_title') || '',
      reasoning_title: record.get('reasoning_title') || '',
      reasoning_summary: record.get('reasoning_summary') || '',
      outcome_label: record.get('outcome_label') || 'Outcome uncertain',
      legal_rules: record.get('legal_rules') || [],
    }))
  })
}

export async function buildCaseGraphInsights({
  issue = '',
  outcome = '',
  legalRule = '',
  side = '',
  caseId = '',
  limit = 5,
}) {
  if (!env.KNOWLEDGE_GRAPH_ENABLED) {
    logger.info('[Graph] Knowledge graph disabled. Skipping Neo4j graph insights.', {
      issue,
      outcome,
      legalRule,
      side,
      limit,
      caseId,
    })
    return emptyGraphInsights()
  }

  const driver = getNeo4jDriver()
  if (!driver) return emptyGraphInsights()

  const normalizedLimit = normalizeNonNegativeInt(limit, 5, 'buildCaseGraphInsights.limit')

  try {
    const [similarCases, argumentsForIssue, reasoningPaths, unresolvedIssues, contradictionHotspots, missingClusters] =
      await Promise.all([
        findCasesByIssueAndOutcome({ issue, outcome, limit: normalizedLimit }),
        findArgumentsForIssue({ issue, side, limit: normalizedLimit }),
        findReasoningTraversal({ issue, legalRule, limit: normalizedLimit }),
        caseId ? findUnresolvedIssuesForDebate({ caseId, limit: normalizedLimit }) : Promise.resolve([]),
        caseId ? findCaseContradictions({ caseId, limit: normalizedLimit }) : Promise.resolve([]),
        findIssueClustersWithMissingEvidence({ minCount: 2, limit: normalizedLimit }),
      ])

    return {
      available: true,
      similar_cases: similarCases,
      arguments: argumentsForIssue,
      reasoning_paths: reasoningPaths,
      unresolved_issues: unresolvedIssues,
      contradiction_hotspots: contradictionHotspots,
      missing_evidence_clusters: missingClusters,
    }
  } catch (error) {
    logger.error('[Graph] Graph insights failed. Continuing without Neo4j enrichment.', {
      issue,
      outcome,
      legalRule,
      side,
      caseId,
      rawLimit: limit,
      normalizedLimit,
      message: error?.message || String(error),
    })

    return emptyGraphInsights()
  }
}
