import { buildChunkRecords } from '../../rag/chunkingService.js'
import { indexUserEvidenceRecords } from './corpusIngestionService.js'

function normalizeText(value) {
  return String(value || '').trim()
}

function buildCaseDescriptionRecord({ caseId, caseInput = {} }) {
  const description = normalizeText(caseInput.description || caseInput.caseText)
  if (!description) return []

  return buildChunkRecords({
    sourceId: `${caseId}-case-description`,
    title: 'User case description',
    text: description,
    metadata: {
      source: 'user_case_input',
      case_id: caseId,
      category: caseInput.category || '',
      jurisdiction: caseInput.jurisdiction || '',
    },
    chunkOptions: {
      chunkSize: 900,
      chunkOverlap: 120,
    },
  })
}

function buildDocumentSummaryRecord({ caseId, detectedDocument, index }) {
  const summary = [
    detectedDocument?.originalName ? `File: ${detectedDocument.originalName}` : '',
    detectedDocument?.detectedType ? `Detected type: ${detectedDocument.detectedType}` : '',
    detectedDocument?.detectedCategory ? `Category: ${detectedDocument.detectedCategory}` : '',
    detectedDocument?.description ? `Description: ${detectedDocument.description}` : '',
    detectedDocument?.reliabilityLabel ? `Reliability: ${detectedDocument.reliabilityLabel}` : '',
  ]
    .filter(Boolean)
    .join('\n')

  if (!summary) return []

  return buildChunkRecords({
    sourceId: `${caseId}-uploaded-doc-${index + 1}`,
    title: detectedDocument?.originalName || `Uploaded document ${index + 1}`,
    text: summary,
    metadata: {
      source: 'user_uploaded_document_summary',
      case_id: caseId,
      detected_type: detectedDocument?.detectedType || '',
      detected_category: detectedDocument?.detectedCategory || '',
      reliability_label: detectedDocument?.reliabilityLabel || '',
    },
    chunkOptions: {
      chunkSize: 700,
      chunkOverlap: 100,
    },
  })
}

function buildEvidenceInventoryRecord({ caseId, evidenceItem, index }) {
  const summary = [
    evidenceItem?.file_name ? `File: ${evidenceItem.file_name}` : '',
    evidenceItem?.detected_type ? `Detected type: ${evidenceItem.detected_type}` : '',
    evidenceItem?.category ? `Category: ${evidenceItem.category}` : '',
    evidenceItem?.basic_description ? `Description: ${evidenceItem.basic_description}` : '',
    evidenceItem?.reliability_label ? `Reliability: ${evidenceItem.reliability_label}` : '',
  ]
    .filter(Boolean)
    .join('\n')

  if (!summary) return []

  return buildChunkRecords({
    sourceId: `${caseId}-evidence-${index + 1}`,
    title: evidenceItem?.file_name || `Evidence ${index + 1}`,
    text: summary,
    metadata: {
      source: 'user_evidence_summary',
      case_id: caseId,
      detected_type: evidenceItem?.detected_type || '',
      category: evidenceItem?.category || '',
      reliability_label: evidenceItem?.reliability_label || '',
    },
    chunkOptions: {
      chunkSize: 700,
      chunkOverlap: 100,
    },
  })
}

export function buildUserEvidenceChunkRecords({
  caseId,
  caseInput = {},
  documentIntelligence = {},
}) {
  const records = [
    ...buildCaseDescriptionRecord({ caseId, caseInput }),
    ...(documentIntelligence?.detected_documents || []).flatMap((item, index) =>
      buildDocumentSummaryRecord({ caseId, detectedDocument: item, index }),
    ),
    ...(documentIntelligence?.evidence_inventory || []).flatMap((item, index) =>
      buildEvidenceInventoryRecord({ caseId, evidenceItem: item, index }),
    ),
  ]

  return records
}

export async function indexUserCaseEvidence({
  caseId,
  caseInput = {},
  documentIntelligence = {},
}) {
  const records = buildUserEvidenceChunkRecords({
    caseId,
    caseInput,
    documentIntelligence,
  })

  return indexUserEvidenceRecords(records)
}
