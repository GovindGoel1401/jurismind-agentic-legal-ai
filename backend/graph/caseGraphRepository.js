import { getNeo4jDriver } from './neo4jClient.js'
import { logger } from '../utils/logger.js'
import { ensureLegalGraphSchema } from './graphSchemaSetup.js'
import { buildLegalGraphModel } from './graphModelBuilder.js'
import { CASE_LOCAL_LABELS } from './legalGraphSchema.js'

function emptyGraphStatus(reason = 'graph_unavailable') {
  return {
    available: false,
    reason,
    nodes_written: 0,
    relationships_written: 0,
  }
}

async function runWrite(session, query, params) {
  const result = await session.run(query, params)
  return result.summary?.counters?.updates() || {}
}

function countUpdate(counter, keys = []) {
  return keys.reduce((sum, key) => sum + Number(counter?.[key] || 0), 0)
}

const NODE_KEY_FIELDS = {
  Case: 'case_id',
  CaseCategory: 'category_key',
  Jurisdiction: 'jurisdiction_key',
  Party: 'party_key',
  Role: 'role_code',
  Claim: 'claim_key',
  Defense: 'defense_key',
  Remedy: 'remedy_key',
  Issue: 'issue_key',
  Fact: 'fact_key',
  Event: 'event_key',
  TimelineMarker: 'marker_key',
  Evidence: 'evidence_key',
  Document: 'document_key',
  Communication: 'communication_key',
  LegalRule: 'rule_key',
  RiskFactor: 'risk_key',
  Contradiction: 'contradiction_key',
  MissingEvidence: 'missing_key',
  HumanFactor: 'human_factor_key',
  StrategyAction: 'strategy_key',
  OutcomePattern: 'pattern_key',
}

const REL_TYPE_PATTERN = /^[A-Z_]+$/

function assertSupportedNodeLabel(label = '') {
  if (!NODE_KEY_FIELDS[label]) {
    throw new Error(`Unsupported graph node label: ${label}`)
  }
}

function ensureCaseNodePresence(nodes = [], caseId = '') {
  if (nodes.some((node) => node.label === 'Case' && node.idValue === caseId)) return nodes
  return [
    {
      label: 'Case',
      idField: 'case_id',
      idValue: caseId,
      properties: {
        source_case_id: caseId,
        summary: '',
        status: 'active',
      },
    },
    ...nodes,
  ]
}

function resolveNodeReference(reference = '') {
  const [label, ...rest] = String(reference || '').split(':')
  const idValue = rest.join(':')
  assertSupportedNodeLabel(label)
  return {
    label,
    idField: NODE_KEY_FIELDS[label],
    idValue,
  }
}

async function upsertNode(session, node = {}) {
  assertSupportedNodeLabel(node.label)
  const idField = node.idField || NODE_KEY_FIELDS[node.label]
  const idValue = String(node.idValue || '').trim()
  if (!idValue) return { nodesCreated: 0 }

  return runWrite(
    session,
    `
      MERGE (n:${node.label} {${idField}: $idValue})
      ON CREATE SET n.created_at = datetime()
      SET n += $properties,
          n.updated_at = datetime()
    `,
    {
      idValue,
      properties: node.properties || {},
    },
  )
}

async function upsertRelationship(session, relationship = {}) {
  const from = resolveNodeReference(relationship.from)
  const to = resolveNodeReference(relationship.to)
  const relType = String(relationship.type || '').trim().toUpperCase()

  if (!relType || !REL_TYPE_PATTERN.test(relType)) {
    throw new Error(`Unsupported relationship type: ${relationship.type}`)
  }

  return runWrite(
    session,
    `
      MATCH (from:${from.label} {${from.idField}: $fromIdValue})
      MATCH (to:${to.label} {${to.idField}: $toIdValue})
      MERGE (from)-[r:${relType}]->(to)
      ON CREATE SET r.created_at = datetime()
      SET r += $properties,
          r.updated_at = datetime()
    `,
    {
      fromIdValue: from.idValue,
      toIdValue: to.idValue,
      properties: relationship.properties || {},
    },
  )
}

async function removeCaseLocalSubgraph(session, caseId = '') {
  return runWrite(
    session,
    `
      MATCH (c:Case {case_id: $caseId})-[r]->(n)
      WHERE any(label IN labels(n) WHERE label IN $caseLocalLabels)
      DELETE r
      WITH n
      WITH n, COUNT { (n)--() } AS degree
      WHERE degree = 0
      DETACH DELETE n
    `,
    {
      caseId,
      caseLocalLabels: Array.from(CASE_LOCAL_LABELS),
    },
  )
}

export async function upsertCaseKnowledgeGraph({
  caseId,
  caseInput = {},
  graphExtraction = {},
  graphResult = {},
  documentIntelligence = {},
}) {
  const driver = getNeo4jDriver()
  if (!driver) return emptyGraphStatus()

  const session = driver.session()
  try {
    await ensureLegalGraphSchema(session)

    const model = buildLegalGraphModel({
      caseId,
      caseInput,
      graphExtraction,
      graphResult,
      documentIntelligence,
    })

    const nodes = ensureCaseNodePresence(model.nodes || [], caseId)
    const relationships = Array.isArray(model.relationships) ? model.relationships : []

    let nodesWritten = 0
    let relationshipsWritten = 0
    const cleanupCounter = await removeCaseLocalSubgraph(session, caseId)
    relationshipsWritten += countUpdate(cleanupCounter, ['relationshipsDeleted'])
    nodesWritten += countUpdate(cleanupCounter, ['nodesDeleted'])

    for (const node of nodes) {
      const counter = await upsertNode(session, node)
      nodesWritten += countUpdate(counter, ['nodesCreated'])
    }

    for (const relationship of relationships) {
      try {
        const counter = await upsertRelationship(session, relationship)
        relationshipsWritten += countUpdate(counter, ['relationshipsCreated'])
      } catch (error) {
        logger.warn('Knowledge graph relationship upsert skipped.', {
          caseId,
          relationship,
          message: error?.message || String(error),
        })
      }
    }

    return {
      available: true,
      reason: 'ok',
      nodes_written: nodesWritten,
      relationships_written: relationshipsWritten,
    }
  } catch (error) {
    logger.warn('Knowledge graph upsert failed.', {
      caseId,
      message: error?.message || String(error),
    })
    return emptyGraphStatus('graph_write_failed')
  } finally {
    await session.close()
  }
}
