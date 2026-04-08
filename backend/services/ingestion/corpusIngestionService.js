import path from 'node:path'

import { env } from '../../config/envConfig.js'
import { embedCaseText } from '../../rag/embeddingService.js'
import { buildChunkRecords } from '../../rag/chunkingService.js'
import { upsertChromaDocuments } from '../../rag/chromaClient.js'
import { upsertQdrantDocuments } from '../../rag/qdrantClient.js'
import { upsertFaissDocuments } from '../../rag/faissClient.js'
import { extractPdfText } from './pdfTextExtractor.js'

function fileStem(filePath) {
  return path.basename(filePath, path.extname(filePath))
}

async function attachEmbeddings(records = [], options = {}) {
  const output = []

  for (const record of records) {
    const vector = await embedCaseText(record.text, options)
    if (!Array.isArray(vector) || !vector.length) continue
    output.push({
      ...record,
      vector,
    })
  }

  return output
}

export async function buildPdfChunkRecords({
  pdfPath,
  sourceType,
  title,
  chunkOptions = {},
  metadata = {},
}) {
  const extracted = await extractPdfText(pdfPath)
  const sourceId = fileStem(pdfPath)

  return buildChunkRecords({
    sourceId,
    title: title || fileStem(pdfPath),
    text: extracted.text,
    chunkOptions,
    metadata: {
      ...metadata,
      source: sourceType,
      pdf_path: pdfPath,
      page_count: extracted.page_count,
    },
  })
}

export async function indexJudgmentPdfToSimilarCasesStore(pdfPath) {
  const chunkRecords = await buildPdfChunkRecords({
    pdfPath,
    sourceType: 'judgment_pdf',
    chunkOptions: {
      // Slightly smaller chunks help legal-fact retrieval stay focused while preserving context.
      chunkSize: 1000,
      chunkOverlap: 150,
    },
    metadata: {
      corpus: 'judgments',
      retrieval_mode: 'similar_cases',
    },
  })
  const embeddedRecords = await attachEmbeddings(chunkRecords, {
    provider: env.EMBEDDING_PROVIDER,
    modality: 'text',
  })
  const useChroma = Boolean(env.CHROMA_API_KEY || env.CHROMA_URL || env.CHROMA_HOST)

  return {
    chunk_count: chunkRecords.length,
    embedded_count: embeddedRecords.length,
    upsert: useChroma
      ? await upsertChromaDocuments({
          collection: env.CHROMA_SIMILAR_CASES_COLLECTION,
          records: embeddedRecords,
        })
      : await upsertQdrantDocuments({
          collection: env.QDRANT_SIMILAR_CASES_COLLECTION,
          records: embeddedRecords,
        }),
  }
}

export async function indexRulePdfToRulesStore(pdfPath) {
  const chunkRecords = await buildPdfChunkRecords({
    pdfPath,
    sourceType: 'rules_pdf',
    chunkOptions: {
      // Rules/statutes are denser, so tighter chunks reduce section bleed between provisions.
      chunkSize: 900,
      chunkOverlap: 120,
    },
    metadata: {
      corpus: 'rules',
    },
  })
  const embeddedRecords = await attachEmbeddings(chunkRecords, {
    provider: env.EMBEDDING_PROVIDER,
    modality: 'text',
  })

  return {
    chunk_count: chunkRecords.length,
    embedded_count: embeddedRecords.length,
    upsert: await upsertQdrantDocuments({
      collection: env.QDRANT_RULES_COLLECTION,
      records: embeddedRecords,
    }),
  }
}

export async function indexUserEvidenceRecords(records = []) {
  const embeddedRecords = await attachEmbeddings(records, {
    provider: env.EMBEDDING_PROVIDER,
    modality: 'multimodal',
  })

  return {
    chunk_count: records.length,
    embedded_count: embeddedRecords.length,
    upsert: await upsertFaissDocuments({
      indexName: env.FAISS_EVIDENCE_INDEX,
      records: embeddedRecords,
    }),
  }
}
