import { buildRetrievalFindings } from './legalSignalSynthesisService.js'

function unique(values) {
  return Array.from(new Set((values || []).filter(Boolean)))
}

function collectVectorSignals(documents = []) {
  const vectorLaws = []
  const vectorSections = []
  const vectorRelatedCases = []

  for (const doc of documents) {
    const meta = doc.metadata || {}
    if (meta.law && !vectorLaws.includes(meta.law)) vectorLaws.push(meta.law)
    if (meta.section && !vectorSections.includes(meta.section)) vectorSections.push(meta.section)
    if (meta.case_title && !vectorRelatedCases.includes(meta.case_title)) {
      vectorRelatedCases.push(meta.case_title)
    }
  }

  return {
    vectorLaws,
    vectorSections,
    vectorRelatedCases,
  }
}

function buildDefaultRules() {
  return ['contract obligations', 'tenant-landlord responsibility principles']
}

function buildDefaultSections() {
  return ['evidence standards for civil disputes']
}

export function buildLegalResearchResult({
  embedding,
  routing,
  retrievedContext,
  graphInsights,
  feedbackSummary,
  feedbackHints,
  workflowMeta = {},
}) {
  const evidenceDocuments = retrievedContext?.evidence?.documents || []
  const ruleDocuments = retrievedContext?.rules?.documents || []
  const combinedDocuments = retrievedContext?.relevant_documents || []
  const graphBundle = retrievedContext?.rules?.graphBundle || {
    relevant_laws: [],
    relevant_sections: [],
    related_cases: [],
    graph_records: [],
  }

  const { vectorLaws, vectorSections, vectorRelatedCases } = collectVectorSignals(ruleDocuments)

  const relevantLaws = unique([...vectorLaws, ...(graphBundle.relevant_laws || [])])
  const relevantSections = unique([...vectorSections, ...(graphBundle.relevant_sections || [])])
  const relatedCases = unique([
    ...vectorRelatedCases,
    ...(graphBundle.related_cases || []),
    ...combinedDocuments.map((doc) => doc.title),
  ])

  const statutes = relevantLaws.length > 0 ? relevantLaws : buildDefaultRules()
  const sections =
    relevantSections.length > 0 ? relevantSections : buildDefaultSections()
  const boostedSections = unique([...sections, ...(feedbackHints || [])]).slice(0, 8)

  const precedents = combinedDocuments.map((doc) => ({
    caseId: doc.id,
    title: doc.title,
    score: doc.score,
    summary: doc.summary,
  }))

  const retrievalContext = {
    mode: retrievedContext?.mode || 'none',
    routing: routing || {},
    evidence_documents: evidenceDocuments,
    rules_documents: ruleDocuments,
    evidence_text_block: retrievedContext?.evidence?.text_block || '',
    rules_text_block: retrievedContext?.rules?.text_block || '',
    debug: retrievedContext?.debug || {},
  }

  const knowledgeBundle = {
    relevant_documents: combinedDocuments,
    relevant_laws: statutes,
    relevant_sections: boostedSections,
    related_cases: relatedCases,
    retrieved_evidence: evidenceDocuments,
    retrieved_rules: ruleDocuments,
    graph_insights: graphInsights || {
      available: false,
      similar_cases: [],
      arguments: [],
      reasoning_paths: [],
    },
  }

  const retrieval_findings = buildRetrievalFindings({
    legalResearch: {
      knowledge_bundle: knowledgeBundle,
      retrieval_context: retrievalContext,
    },
    similarCaseIntelligence: {
      similar_cases: precedents,
    },
  })

  const legalResearchMeta = {
    ...workflowMeta,
    embeddingDimensions: Array.isArray(embedding) ? embedding.length : 0,
    retrievedDocumentCount: combinedDocuments.length,
    evidenceDocumentCount: evidenceDocuments.length,
    rulesDocumentCount: ruleDocuments.length,
    retrievalMode: retrievedContext?.mode || 'none',
    retrievalAvailable:
      (retrievedContext?.evidence?.meta?.retrievalAvailable ?? false) ||
      (retrievedContext?.rules?.meta?.retrievalAvailable ?? false),
    graphRecordCount: (graphBundle.graph_records || []).length,
    graphContext: workflowMeta?.graphContext || {
      available: false,
      reason: 'not_provided',
    },
    lawCount: statutes.length,
    sectionCount: boostedSections.length,
  }

  return {
    relevant_laws: statutes,
    relevant_sections: boostedSections,
    similar_cases: precedents,
    related_cases: relatedCases,
    relevant_documents: combinedDocuments,
    knowledge_bundle: knowledgeBundle,
    retrieval_routing: routing || {},
    retrieval_context: retrievalContext,
    retrieval_findings,
    legalResearch: {
      embedding_dimensions: Array.isArray(embedding) ? embedding.length : 0,
      feedback_learning_summary: feedbackSummary || '',
      graphContext: graphBundle.graph_records || [],
      graph_context: legalResearchMeta.graphContext,
      graphInsights: graphInsights || {
        available: false,
        similar_cases: [],
        arguments: [],
        reasoning_paths: [],
      },
      statutes,
      precedents,
      knowledge_bundle: knowledgeBundle,
      retrieval_context: retrievalContext,
      retrieval_findings,
      meta: legalResearchMeta,
    },
    legalResearchMeta,
  }
}
