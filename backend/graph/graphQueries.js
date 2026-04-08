import { getNeo4jDriver } from './neo4jClient.js'
import { logger } from '../utils/logger.js'

function emptyGraphKnowledgeBundle() {
  return {
    relevant_laws: [],
    relevant_sections: [],
    related_cases: [],
    graph_records: [],
  }
}

export async function fetchRelatedLawsAndCases(caseTopic) {
  const driver = getNeo4jDriver()

  if (!driver) {
    return []
  }

  const session = driver.session()
  try {
    const cypher = `
      MATCH (l:LegalRule)<-[:TRIGGERS_RULE]-(:Issue)<-[:RAISES_ISSUE]-(c:Case)
      WHERE toLower(l.label) CONTAINS toLower($topic)
         OR toLower(c.summary) CONTAINS toLower($topic)
      RETURN l.label AS law, c.summary AS relatedCase
      LIMIT 10
    `

    const result = await session.run(cypher, { topic: caseTopic || '' })
    return result.records.map((record) => ({
      law: record.get('law'),
      relatedCase: record.get('relatedCase'),
    }))
  } catch (error) {
    logger.warn('Neo4j related-laws lookup failed. Returning empty results.', {
      topic: caseTopic || '',
      message: error?.message || String(error),
    })
    return []
  } finally {
    await session.close()
  }
}

export async function fetchGraphKnowledgeBundle(caseTopic) {
  const driver = getNeo4jDriver()

  if (!driver) {
    return emptyGraphKnowledgeBundle()
  }

  const session = driver.session()
  try {
    const cypherPrimary = `
      MATCH (law:LegalRule)<-[:TRIGGERS_RULE]-(i:Issue)<-[:RAISES_ISSUE]-(c:Case)
      OPTIONAL MATCH (c)-[:SIMILAR_TO]->(related:Case)
      WHERE toLower(law.label) CONTAINS toLower($topic)
         OR toLower(i.title) CONTAINS toLower($topic)
         OR toLower(c.summary) CONTAINS toLower($topic)
      RETURN DISTINCT
        law.label AS law,
        i.title AS section,
        c.case_id AS court_case,
        related.case_id AS related_case
      LIMIT 20
    `

    let result = await session.run(cypherPrimary, { topic: caseTopic || '' })

    // Backward-compatible fallback schema.
    if (result.records.length === 0) {
      const cypherFallback = `
        MATCH (l:LegalRule)
        WHERE toLower(l.label) CONTAINS toLower($topic)
        RETURN DISTINCT
          l.label AS law,
          '' AS section,
          '' AS court_case,
          '' AS related_case
        LIMIT 20
      `
      result = await session.run(cypherFallback, { topic: caseTopic || '' })
    }

    const relevant_laws = []
    const relevant_sections = []
    const related_cases = []
    const graph_records = []

    for (const record of result.records) {
      const law = record.get('law')
      const section = record.get('section')
      const caseTitle = record.get('court_case')
      const relatedCase = record.get('related_case')

      if (law && !relevant_laws.includes(law)) relevant_laws.push(law)
      if (section && !relevant_sections.includes(section)) relevant_sections.push(section)
      if (caseTitle && !related_cases.includes(caseTitle)) related_cases.push(caseTitle)
      if (relatedCase && !related_cases.includes(relatedCase)) related_cases.push(relatedCase)

      graph_records.push({
        law,
        section,
        court_case: caseTitle,
        related_case: relatedCase,
      })
    }

    return {
      relevant_laws,
      relevant_sections,
      related_cases,
      graph_records,
    }
  } catch (error) {
    logger.warn('Neo4j graph knowledge fetch failed. Returning empty graph bundle.', {
      topic: caseTopic || '',
      message: error?.message || String(error),
    })
    return emptyGraphKnowledgeBundle()
  } finally {
    await session.close()
  }
}
