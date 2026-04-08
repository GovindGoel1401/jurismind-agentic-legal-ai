import assert from 'node:assert/strict'

import { fetchGraphKnowledgeBundle } from '../graph/graphQueries.js'
import { buildGraphExample } from '../services/caseKnowledgeGraphService.js'
import { buildSimilarCaseIntelligence } from '../services/similarCaseIntelligenceService.js'
import { buildLegalResearchResult } from '../services/legalResearchResultService.js'

async function testBuildGraphExample() {
  const example = buildGraphExample(
    {
      case_summary: 'Payment default dispute.',
      issues: [{ title: 'breach of contract' }],
      arguments: [{ title: 'Signed agreement proves obligation.' }],
      evidence_items: [{ label: 'Signed contract' }],
      legal_rules: [{ label: 'Indian Contract Act' }],
      outcome: { label: 'Plaintiff likely succeeds' },
    },
    'case-123',
  )

  assert.equal(example.case.case_id, 'case-123')
  assert.equal(example.sample_path.issue, 'breach of contract')
  assert.equal(example.sample_path.argument, 'Signed agreement proves obligation.')
}

async function testGraphInsightsFlowIntoSimilarCaseIntelligence() {
  const intelligence = buildSimilarCaseIntelligence({
    currentCase: {
      description: 'Breach of contract dispute over payment.',
      category: 'contract',
      jurisdiction: 'Delhi',
    },
    documentIntelligence: {
      detected_documents: [],
    },
    caseAssessment: {},
    retrievedCases: [],
    graphInsights: {
      available: true,
      similar_cases: [{ case_id: 'kg-1', issue_title: 'breach of contract' }],
      arguments: [{ title: 'Prior payment demand was decisive.' }],
      reasoning_paths: [{ reasoning_title: 'Court relied on documentary consistency.' }],
    },
  })

  assert.equal(intelligence.graph_insights.available, true)
  assert.equal(intelligence.graph_insights.similar_cases.length, 1)
}

async function testGraphInsightsFlowIntoLegalResearchResult() {
  const result = buildLegalResearchResult({
    embedding: [],
    routing: {
      evidence_required: 'NO',
      rules_required: 'NO',
      no_retrieval: 'YES',
      reason: 'No retrieval',
    },
    retrievedContext: {
      mode: 'none',
      evidence: { documents: [], text_block: '', meta: { retrievalAvailable: false } },
      rules: {
        documents: [],
        text_block: '',
        meta: { retrievalAvailable: false },
        graphBundle: { relevant_laws: [], relevant_sections: [], related_cases: [], graph_records: [] },
      },
      relevant_documents: [],
      debug: {},
    },
    graphInsights: {
      available: true,
      similar_cases: [{ case_id: 'kg-1' }],
      arguments: [{ title: 'Argument A' }],
      reasoning_paths: [{ reasoning_title: 'Reasoning A' }],
    },
    feedbackSummary: '',
    feedbackHints: [],
    workflowMeta: {},
  })

  assert.equal(result.knowledge_bundle.graph_insights.available, true)
  assert.equal(result.legalResearch.graphInsights.arguments.length, 1)
}

async function testGraphKnowledgeBundleFallsBackCleanlyWhenGraphDisabled() {
  const bundle = await fetchGraphKnowledgeBundle('breach of contract')

  assert.deepEqual(bundle, {
    relevant_laws: [],
    relevant_sections: [],
    related_cases: [],
    graph_records: [],
  })
}

async function run() {
  await testBuildGraphExample()
  await testGraphInsightsFlowIntoSimilarCaseIntelligence()
  await testGraphInsightsFlowIntoLegalResearchResult()
  await testGraphKnowledgeBundleFallsBackCleanlyWhenGraphDisabled()
  console.log('knowledgeGraph tests passed')
}

run().catch((error) => {
  console.error(error)
  process.exitCode = 1
})
