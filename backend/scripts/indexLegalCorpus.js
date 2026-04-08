import path from 'node:path'
import { fileURLToPath } from 'node:url'

import { logger } from '../utils/logger.js'
import {
  buildPdfChunkRecords,
  indexJudgmentPdfToSimilarCasesStore,
  indexRulePdfToRulesStore,
} from '../services/ingestion/corpusIngestionService.js'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const projectRoot = path.resolve(__dirname, '..', '..')

const judgmentPdfPaths = [
  path.resolve(projectRoot, 'dbsimilarcasecontract.pdf'),
  path.resolve(projectRoot, 'indianconscontract.pdf'),
]

const rulePdfPaths = [
  path.resolve(projectRoot, '2023111188.pdf'),
  path.resolve(projectRoot, '2022080877.pdf'),
  path.resolve(projectRoot, '2022080820.pdf'),
  path.resolve(projectRoot, 'negotiable_instruments_act,_1881.pdf'),
]

async function run() {
  const dryRun = process.argv.includes('--dry-run')
  logger.info('Starting legal corpus ingestion.', {
    judgmentPdfCount: judgmentPdfPaths.length,
    rulePdfCount: rulePdfPaths.length,
    dryRun,
  })

  const judgmentResults = []
  for (const pdfPath of judgmentPdfPaths) {
    if (dryRun) {
      const records = await buildPdfChunkRecords({
        pdfPath,
        sourceType: 'judgment_pdf',
        metadata: { corpus: 'judgments' },
      })
      judgmentResults.push({
        pdfPath,
        chunk_count: records.length,
        embedded_count: 0,
        upsert: {
          success: false,
          reason: 'dry_run',
        },
      })
      continue
    }

    judgmentResults.push({
      pdfPath,
      ...(await indexJudgmentPdfToSimilarCasesStore(pdfPath)),
    })
  }

  const ruleResults = []
  for (const pdfPath of rulePdfPaths) {
    if (dryRun) {
      const records = await buildPdfChunkRecords({
        pdfPath,
        sourceType: 'rules_pdf',
        metadata: { corpus: 'rules' },
      })
      ruleResults.push({
        pdfPath,
        chunk_count: records.length,
        embedded_count: 0,
        upsert: {
          success: false,
          reason: 'dry_run',
        },
      })
      continue
    }

    ruleResults.push({
      pdfPath,
      ...(await indexRulePdfToRulesStore(pdfPath)),
    })
  }

  const summary = {
    judgments: judgmentResults,
    rules: ruleResults,
  }

  logger.info('Legal corpus ingestion completed.', summary)
  console.log(JSON.stringify(summary, null, 2))
}

run().catch((error) => {
  logger.error('Legal corpus ingestion failed.', {
    message: error?.message || String(error),
  })
  process.exit(1)
})
