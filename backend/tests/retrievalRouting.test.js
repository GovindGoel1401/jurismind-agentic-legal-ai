import assert from 'node:assert/strict'

import {
  getConditionalRetrievedContext,
  normalizeRetrievalRoutingDecision,
  resolveRetrievalMode,
} from '../services/retrievalRoutingService.js'

async function testNormalizeRetrievalRoutingDecision() {
  const normalized = normalizeRetrievalRoutingDecision({
    evidence_required: 'YES',
    rules_required: 'NO',
    no_retrieval: 'YES',
    reason: 'fact grounding needed',
  })

  assert.equal(normalized.evidence_required, 'YES')
  assert.equal(normalized.rules_required, 'NO')
  assert.equal(normalized.no_retrieval, 'NO')
  assert.equal(resolveRetrievalMode(normalized), 'evidence_only')
}

async function testConditionalEvidenceOnlyRetrieval() {
  let evidenceCalls = 0
  let rulesCalls = 0

  const result = await getConditionalRetrievedContext({
    routing: {
      evidence_required: 'YES',
      rules_required: 'NO',
      no_retrieval: 'NO',
      reason: 'Needs document grounding',
    },
    queryText: 'Show the proof for the payment record.',
    state: {},
    vector: [0.1, 0.2],
    dependencies: {
      retrieveEvidenceContext: async () => {
        evidenceCalls += 1
        return {
          documents: [{ id: 'doc-1', title: 'Payment receipt', summary: 'Receipt says paid.' }],
          vectorResult: {
            relevant_documents: [{ id: 'doc-1', title: 'Payment receipt', summary: 'Receipt says paid.' }],
            retrieval_meta: { available: true, namespace: 'evidence', mode: 'evidence' },
          },
          text_block: '1. Payment receipt\nReceipt says paid.',
          meta: {
            selectedChunkCount: 1,
            namespace: 'evidence',
            retrievalAvailable: true,
          },
        }
      },
      retrieveRulesContext: async () => {
        rulesCalls += 1
        return {}
      },
    },
  })

  assert.equal(evidenceCalls, 1)
  assert.equal(rulesCalls, 0)
  assert.equal(result.mode, 'evidence_only')
  assert.equal(result.relevant_documents.length, 1)
}

async function testNoRetrievalBranch() {
  let evidenceCalls = 0
  let rulesCalls = 0

  const result = await getConditionalRetrievedContext({
    routing: {
      evidence_required: 'NO',
      rules_required: 'NO',
      no_retrieval: 'YES',
      reason: 'Continuity only',
    },
    queryText: 'Continue the debate from the previous point.',
    state: {},
    dependencies: {
      retrieveEvidenceContext: async () => {
        evidenceCalls += 1
        return {}
      },
      retrieveRulesContext: async () => {
        rulesCalls += 1
        return {}
      },
    },
  })

  assert.equal(evidenceCalls, 0)
  assert.equal(rulesCalls, 0)
  assert.equal(result.mode, 'none')
  assert.equal(result.relevant_documents.length, 0)
}

async function run() {
  await testNormalizeRetrievalRoutingDecision()
  await testConditionalEvidenceOnlyRetrieval()
  await testNoRetrievalBranch()
  console.log('retrievalRouting tests passed')
}

run().catch((error) => {
  console.error(error)
  process.exitCode = 1
})
