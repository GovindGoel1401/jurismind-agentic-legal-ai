import assert from 'node:assert/strict'

import { env } from '../config/envConfig.js'
import {
  RETRIEVAL_PROVIDERS,
  resolveRetrievalProvider,
} from '../rag/retriever.js'

async function testProviderResolution() {
  const expectedJudgmentProvider =
    env.CHROMA_API_KEY || env.CHROMA_URL || env.CHROMA_HOST
      ? RETRIEVAL_PROVIDERS.CHROMA
      : RETRIEVAL_PROVIDERS.QDRANT

  assert.equal(resolveRetrievalProvider('judgments', ''), expectedJudgmentProvider)
  assert.equal(resolveRetrievalProvider('similar_cases', ''), expectedJudgmentProvider)
  assert.equal(resolveRetrievalProvider('evidence', ''), RETRIEVAL_PROVIDERS.FAISS)
  assert.equal(resolveRetrievalProvider('debate', ''), RETRIEVAL_PROVIDERS.FAISS)
  assert.equal(resolveRetrievalProvider('rules', ''), RETRIEVAL_PROVIDERS.QDRANT)
  assert.equal(resolveRetrievalProvider('rules', RETRIEVAL_PROVIDERS.CHROMA), RETRIEVAL_PROVIDERS.CHROMA)
}

async function run() {
  await testProviderResolution()
  console.log('retrievalProviders tests passed')
}

run().catch((error) => {
  console.error(error)
  process.exitCode = 1
})
