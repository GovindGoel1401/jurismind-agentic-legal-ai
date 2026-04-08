import assert from 'node:assert/strict'

import { chunkText, buildChunkRecords } from '../rag/chunkingService.js'
import { buildUserEvidenceChunkRecords } from '../services/ingestion/userEvidenceIndexingService.js'

async function testChunkText() {
  const chunks = chunkText('Para one.\n\nPara two is a little longer.\n\nPara three.', {
    chunkSize: 25,
    chunkOverlap: 5,
  })

  assert.ok(chunks.length >= 2)
}

async function testBuildChunkRecords() {
  const records = buildChunkRecords({
    sourceId: 'sample',
    title: 'Sample Title',
    text: 'A short text chunk for testing.',
  })

  assert.equal(records.length, 1)
  assert.equal(records[0].metadata.title, 'Sample Title')
}

async function testBuildUserEvidenceChunkRecords() {
  const records = buildUserEvidenceChunkRecords({
    caseId: 'case-1',
    caseInput: {
      description: 'User says there was a contract breach and payment default.',
      category: 'contract dispute',
      jurisdiction: 'Delhi',
    },
    documentIntelligence: {
      detected_documents: [
        {
          originalName: 'invoice.pdf',
          detectedType: 'payment-proof',
          detectedCategory: 'financial',
          description: 'Invoice showing outstanding amount.',
          reliabilityLabel: 'medium',
        },
      ],
      evidence_inventory: [
        {
          file_name: 'notice.pdf',
          detected_type: 'notice-letter',
          category: 'notice',
          basic_description: 'Legal notice sent to the other party.',
          reliability_label: 'high',
        },
      ],
    },
  })

  assert.ok(records.length >= 3)
  assert.ok(records.some((item) => item.metadata.source === 'user_case_input'))
  assert.ok(records.some((item) => item.metadata.source === 'user_uploaded_document_summary'))
  assert.ok(records.some((item) => item.metadata.source === 'user_evidence_summary'))
}

async function run() {
  await testChunkText()
  await testBuildChunkRecords()
  await testBuildUserEvidenceChunkRecords()
  console.log('ingestion tests passed')
}

run().catch((error) => {
  console.error(error)
  process.exitCode = 1
})
