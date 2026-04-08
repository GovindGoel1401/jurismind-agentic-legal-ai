import { classifyDocument } from './documentClassifier.js'
import { getDocumentChecklist } from './documentChecklistCatalog.js'

function normalize(value) {
  return String(value || '').trim().toLowerCase()
}

function containsAny(text, needles = []) {
  return needles.some((needle) => text.includes(needle))
}

function dedupeChecklist(items = []) {
  const seen = new Set()
  return items.filter((item) => {
    const key = String(item?.type || '').trim().toLowerCase()
    if (!key || seen.has(key)) return false
    seen.add(key)
    return true
  })
}

function mapInterpreterCaseTypeToCategory(caseType = '') {
  const normalized = normalize(caseType)

  if (normalized.includes('rental')) return 'Rental dispute'
  if (normalized.includes('employment')) return 'Employment dispute'
  if (normalized.includes('contract')) return 'Contract dispute'
  if (normalized.includes('consumer')) return 'Consumer complaint'

  return ''
}

function buildDynamicChecklist(caseInput = {}, structuredCase = {}) {
  const description = normalize(caseInput.description || caseInput.caseText || '')
  const category = normalize(caseInput.category || mapInterpreterCaseTypeToCategory(structuredCase.case_type))
  const required = []
  const optional = []

  if (category === 'contract dispute' || containsAny(description, ['contract', 'agreement', 'supplier', 'delivery', 'advance'])) {
    required.push(
      {
        type: 'contract-copy',
        label: 'Signed contract or agreement',
        description: 'Written agreement, purchase order, quotation acceptance, or signed undertaking connected to this dispute.',
      },
      {
        type: 'breach-notice',
        label: 'Breach notice or dispute communication',
        description: 'Emails, legal notice, WhatsApp chats, or written exchanges showing delay, refusal, or non-performance.',
      },
    )
    optional.push({
      type: 'delivery-proof',
      label: 'Delivery or execution proof',
      description: 'Dispatch proof, delivery note, milestone proof, or service completion record tied to the contract.',
    })
  }

  if (containsAny(description, ['payment', 'bank transfer', 'advance', 'utr', 'receipt', 'paid'])) {
    required.push({
      type: 'payment-proof',
      label: 'Payment proof',
      description: 'Bank transfer, receipt, UTR, statement entry, or other proof showing the disputed payment.',
    })
  }

  if (containsAny(description, ['whatsapp', 'email', 'message', 'call', 'conversation', 'chat'])) {
    required.push({
      type: 'communication-record',
      label: 'Communication record',
      description: 'WhatsApp chats, emails, letters, call follow-up messages, or complaint history relevant to the dispute.',
    })
  }

  if (containsAny(description, ['legal notice', 'notice sent', 'demand notice', 'notice'])) {
    required.push({
      type: 'notice-letter',
      label: 'Notice or legal communication',
      description: 'Demand notice, legal notice, reply notice, or written grievance exchanged between the parties.',
    })
  }

  if (containsAny(description, ['loss', 'damages', 'construction stopped', 'delay', 'financial loss'])) {
    optional.push({
      type: 'loss-proof',
      label: 'Loss or damage proof',
      description: 'Invoices, ledgers, delay calculations, labour bills, or records showing the financial impact caused by the dispute.',
    })
  }

  if (category === 'rental dispute' || containsAny(description, ['tenant', 'landlord', 'rent', 'deposit'])) {
    required.push({
      type: 'lease-agreement',
      label: 'Lease or rental agreement',
      description: 'Tenancy agreement, lease terms, or written rent arrangement relevant to the dispute.',
    })
  }

  if (category === 'employment dispute' || containsAny(description, ['employer', 'salary', 'termination', 'hr'])) {
    required.push({
      type: 'employment-contract',
      label: 'Employment contract or offer letter',
      description: 'Appointment letter, role terms, salary terms, or other employment record supporting the dispute.',
    })
  }

  if (category === 'consumer complaint' || containsAny(description, ['product', 'service', 'defect', 'refund', 'replacement'])) {
    required.push({
      type: 'purchase-proof',
      label: 'Purchase proof',
      description: 'Invoice, order confirmation, receipt, or transaction record showing the purchase or service relationship.',
    })
  }

  return {
    required: dedupeChecklist(required),
    optional: dedupeChecklist(optional),
  }
}

function toChecklistStatus(item, detectedDocuments) {
  const match = detectedDocuments.find((document) => document.detectedType === item.type)
  return {
    ...item,
    status: match ? 'available' : 'missing',
    matchedDocument: match
      ? {
          id: match.id,
          name: match.originalName,
          confidence: match.confidence,
          inventoryStatus: match.inventoryStatus,
        }
      : null,
  }
}

function buildReliabilityNotes(detectedDocuments, requiredChecklist, completenessScore) {
  const notes = []
  const unclassified = detectedDocuments.filter((document) => document.detectedType === 'unclassified-document')
  const notUsable = detectedDocuments.filter((document) => !document.usableForAnalysis)
  const missingRequired = requiredChecklist.filter((item) => item.status === 'missing')

  if (missingRequired.length) {
    notes.push(`Missing ${missingRequired.length} likely required document(s) for this case package.`)
  }
  if (unclassified.length) {
    notes.push(`${unclassified.length} uploaded file(s) could not be mapped confidently to a legal document type.`)
  }
  if (notUsable.length) {
    notes.push(`${notUsable.length} uploaded file(s) may have limited value for deeper legal analysis in the current form.`)
  }
  if (completenessScore >= 75) {
    notes.push('The current submission looks reasonably case-ready for deeper analysis.')
  } else if (completenessScore >= 45) {
    notes.push('The current submission is partially ready, but additional records could materially improve reliability.')
  } else {
    notes.push('The current submission appears incomplete and should be strengthened before relying on downstream legal predictions.')
  }

  return notes
}

export function buildDocumentIntelligence(caseInput = {}, options = {}) {
  const evidence = Array.isArray(caseInput.evidence) ? caseInput.evidence : []
  const structuredCase = options?.structuredCase || {}
  const inferredCategory = caseInput.category || mapInterpreterCaseTypeToCategory(structuredCase.case_type)
  const checklistConfig = getDocumentChecklist(inferredCategory, caseInput.jurisdiction)
  const dynamicChecklist = buildDynamicChecklist(
    {
      ...caseInput,
      category: inferredCategory || caseInput.category,
    },
    structuredCase,
  )
  const detectedDocuments = evidence.map((file) => classifyDocument(file))
  const requiredChecklist = dedupeChecklist([
    ...checklistConfig.required,
    ...dynamicChecklist.required,
  ]).map((item) => toChecklistStatus(item, detectedDocuments))
  const optionalChecklist = dedupeChecklist([
    ...checklistConfig.optional,
    ...dynamicChecklist.optional,
  ]).map((item) => toChecklistStatus(item, detectedDocuments))

  const availableDocuments = requiredChecklist.filter((item) => item.status === 'available')
  const missingDocuments = requiredChecklist.filter((item) => item.status === 'missing')
  const optionalDocuments = optionalChecklist.map((item) => ({
    ...item,
    status: item.status === 'available' ? 'available' : 'optional',
  }))

  const availableRequiredCount = availableDocuments.length
  const requiredCount = requiredChecklist.length || 1
  const optionalCoverage = optionalChecklist.length
    ? optionalChecklist.filter((item) => item.status === 'available').length / optionalChecklist.length
    : 0
  const classificationConfidence =
    detectedDocuments.length > 0
      ? detectedDocuments.reduce((sum, item) => sum + Number(item.confidence || 0), 0) / detectedDocuments.length
      : 0

  const completenessScore = Math.round(
    (availableRequiredCount / requiredCount * 0.75 + optionalCoverage * 0.1 + classificationConfidence * 0.15) * 100,
  )

  const readinessStatus =
    completenessScore >= 75 ? 'READY' : completenessScore >= 45 ? 'PARTIAL' : 'NOT_READY'

  return {
    case_submission: {
      category: caseInput.category || '',
      inferredCategory: inferredCategory || '',
      jurisdiction: caseInput.jurisdiction || '',
      descriptionLength: String(caseInput.description || '').trim().length,
      uploadedDocumentCount: detectedDocuments.length,
    },
    structured_case: structuredCase,
    detected_documents: detectedDocuments,
    available_documents: availableDocuments,
    missing_documents: missingDocuments,
    optional_documents: optionalDocuments,
    evidence_inventory: detectedDocuments.map((document) => ({
      id: document.id,
      file_name: document.originalName,
      detected_type: document.detectedType,
      category: document.detectedCategory,
      basic_description: document.description,
      usable_for_analysis: document.usableForAnalysis,
      confidence: document.confidence,
      reliability_label: document.reliabilityLabel,
      inventory_status: document.inventoryStatus,
      size_bytes: document.sizeBytes,
    })),
    checklist: {
      required: requiredChecklist,
      optional: optionalChecklist,
    },
    completeness_score: completenessScore,
    completeness_explanation: `${availableRequiredCount} of ${requiredChecklist.length} likely required documents are currently covered.`,
    readiness_status: readinessStatus,
    readiness_assessment: {
      label: readinessStatus,
      summary:
        readinessStatus === 'READY'
          ? 'Core dispute records are mostly present and the submission is ready for deeper analysis.'
          : readinessStatus === 'PARTIAL'
            ? 'Some useful documents are present, but the case package still has material gaps.'
            : 'The case package is currently thin and should be supplemented before strong downstream conclusions.',
    },
    initial_reliability_notes: buildReliabilityNotes(
      detectedDocuments,
      requiredChecklist,
      completenessScore,
    ),
  }
}
