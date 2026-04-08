import type {
  AnalyzeCasePayload,
  DocumentChecklistEntry,
  DocumentIntelligencePayload,
  EvidenceInventoryEntry,
} from '../../services/caseService'

export interface DocumentChecklistItem {
  type: string
  label: string
  description: string
}

export interface FrontendDocumentInventoryItem {
  id: string
  name: string
  detectedType: string
  detectedCategory: string
  description: string
  confidence: number
  reliabilityLabel: string
  inventoryStatus: 'confirmed' | 'likely' | 'unclassified'
  usableForAnalysis: boolean
  sizeBytes: number
}

const defaultChecklist = {
  required: [
    {
      type: 'identity-proof',
      label: 'Identity proof',
      description: 'Government identity or client identification record.',
    },
    {
      type: 'primary-fact-record',
      label: 'Primary fact record',
      description: 'Core document establishing the event, incident, or dispute facts.',
    },
  ],
  optional: [
    {
      type: 'witness-statement',
      label: 'Witness statement',
      description: 'Third-party statement or supporting narrative.',
    },
    {
      type: 'timeline-summary',
      label: 'Timeline summary',
      description: 'Chronology of key dates and actions.',
    },
  ],
}

const checklistByCategory: Record<string, { required: DocumentChecklistItem[]; optional: DocumentChecklistItem[] }> = {
  'Rental dispute': {
    required: [
      {
        type: 'lease-agreement',
        label: 'Lease or rental agreement',
        description: 'Signed rent agreement or tenancy terms.',
      },
      {
        type: 'payment-proof',
        label: 'Rent payment proof',
        description: 'Receipts, bank transfers, or payment confirmations.',
      },
      {
        type: 'notice-letter',
        label: 'Notice or legal communication',
        description: 'Eviction, legal, or complaint notices.',
      },
    ],
    optional: [
      {
        type: 'property-photos',
        label: 'Property photos',
        description: 'Images showing condition, damage, or occupancy issues.',
      },
      {
        type: 'inspection-report',
        label: 'Inspection report',
        description: 'Maintenance or property inspection record.',
      },
    ],
  },
  'Employment dispute': {
    required: [
      {
        type: 'employment-contract',
        label: 'Employment contract or offer letter',
        description: 'Formal employment terms or appointment proof.',
      },
      {
        type: 'salary-record',
        label: 'Salary or payslip record',
        description: 'Compensation or payroll documentation.',
      },
      {
        type: 'termination-letter',
        label: 'Termination or HR notice',
        description: 'Official warning, termination, or HR action.',
      },
    ],
    optional: [
      {
        type: 'email-thread',
        label: 'Email or chat communication',
        description: 'Workplace communication tied to the dispute.',
      },
      {
        type: 'performance-review',
        label: 'Performance review',
        description: 'Performance records or appraisal history.',
      },
    ],
  },
  'Contract dispute': {
    required: [
      {
        type: 'contract-copy',
        label: 'Signed contract or agreement',
        description: 'Primary contract, amendment, or signed undertaking.',
      },
      {
        type: 'invoice-record',
        label: 'Invoice or billing record',
        description: 'Invoice, billing statement, or demand note.',
      },
      {
        type: 'breach-notice',
        label: 'Breach notice or dispute communication',
        description: 'Notice alleging breach or non-performance.',
      },
    ],
    optional: [
      {
        type: 'delivery-proof',
        label: 'Delivery or execution proof',
        description: 'Records showing delivery, execution, or milestone completion.',
      },
      {
        type: 'payment-proof',
        label: 'Payment proof',
        description: 'Receipts, bank transfers, or remittance proof.',
      },
    ],
  },
  'Consumer complaint': {
    required: [
      {
        type: 'purchase-proof',
        label: 'Purchase proof',
        description: 'Invoice, receipt, or order confirmation.',
      },
      {
        type: 'product-service-record',
        label: 'Product or service record',
        description: 'Warranty card, service terms, or service contract.',
      },
      {
        type: 'complaint-record',
        label: 'Complaint or support record',
        description: 'Complaint ticket, support email, or grievance record.',
      },
    ],
    optional: [
      {
        type: 'refund-request',
        label: 'Refund or replacement request',
        description: 'Remedy or replacement request documentation.',
      },
      {
        type: 'photo-proof',
        label: 'Photo or screenshot proof',
        description: 'Visual proof of defect, misrepresentation, or issue.',
      },
    ],
  },
}

const fileRules = [
  { type: 'lease-agreement', category: 'agreement', keywords: ['lease', 'rental', 'tenancy', 'rent'] },
  { type: 'employment-contract', category: 'agreement', keywords: ['employment', 'offer', 'appointment'] },
  { type: 'contract-copy', category: 'agreement', keywords: ['contract', 'agreement', 'msa'] },
  { type: 'payment-proof', category: 'financial-record', keywords: ['payment', 'receipt', 'bank', 'utr', 'transfer'] },
  { type: 'salary-record', category: 'financial-record', keywords: ['salary', 'payslip', 'payroll'] },
  { type: 'invoice-record', category: 'financial-record', keywords: ['invoice', 'bill', 'statement'] },
  { type: 'purchase-proof', category: 'financial-record', keywords: ['order', 'purchase', 'receipt', 'invoice'] },
  { type: 'notice-letter', category: 'formal-notice', keywords: ['notice', 'demand', 'eviction'] },
  { type: 'termination-letter', category: 'formal-notice', keywords: ['termination', 'warning', 'hr'] },
  { type: 'breach-notice', category: 'formal-notice', keywords: ['breach', 'default'] },
  { type: 'complaint-record', category: 'communication', keywords: ['complaint', 'grievance', 'support'] },
  { type: 'email-thread', category: 'communication', keywords: ['email', 'mail', 'chat', 'whatsapp'] },
  { type: 'identity-proof', category: 'identity-record', keywords: ['aadhaar', 'aadhar', 'passport', 'pan', 'identity'] },
  { type: 'property-photos', category: 'visual-proof', keywords: ['photo', 'image', 'damage', 'property'] },
  { type: 'photo-proof', category: 'visual-proof', keywords: ['photo', 'screenshot', 'image'] },
]

function normalize(value: string) {
  return value.trim().toLowerCase()
}

function scoreRule(rule: (typeof fileRules)[number], haystack: string, mimeType: string) {
  let score = 0
  for (const keyword of rule.keywords) {
    if (haystack.includes(keyword)) {
      score += keyword.length > 6 ? 3 : 2
    }
  }
  if (mimeType.startsWith('image/') && rule.category === 'visual-proof') score += 2
  if (mimeType.includes('pdf') && ['agreement', 'formal-notice'].includes(rule.category)) score += 1
  return score
}

export function getCaseInputChecklist(category: string) {
  const categoryChecklist = checklistByCategory[category] || { required: [], optional: [] }
  return {
    required: [...defaultChecklist.required, ...categoryChecklist.required],
    optional: [...defaultChecklist.optional, ...categoryChecklist.optional],
  }
}

export function classifyFrontendDocument(file: File): FrontendDocumentInventoryItem {
  const name = normalize(file.name)
  const mimeType = normalize(file.type || 'application/octet-stream')
  const haystack = `${name} ${mimeType}`

  let bestRule: (typeof fileRules)[number] | null = null
  let bestScore = 0

  for (const rule of fileRules) {
    const score = scoreRule(rule, haystack, mimeType)
    if (score > bestScore) {
      bestScore = score
      bestRule = rule
    }
  }

  return {
    id: `${file.name}-${file.size}`,
    name: file.name,
    detectedType: bestRule?.type || 'unclassified-document',
    detectedCategory: bestRule?.category || 'uncategorized',
    description: bestRule
      ? `Likely ${bestRule.type.replace(/-/g, ' ')} based on file name and format.`
      : 'This file could not be confidently mapped to a known legal document type yet.',
    confidence: Math.min(0.95, bestScore >= 5 ? 0.88 : bestScore >= 2 ? 0.66 : 0.34),
    reliabilityLabel: mimeType.startsWith('image/')
      ? 'visual-support'
      : bestRule
        ? 'document-backed'
        : 'uncertain-source',
    inventoryStatus: bestScore >= 5 ? 'confirmed' : bestScore >= 2 ? 'likely' : 'unclassified',
    usableForAnalysis: bestScore >= 2 || mimeType === 'application/pdf' || mimeType.startsWith('image/'),
    sizeBytes: file.size,
  }
}

export function buildDocumentPreview(category: string, files: File[]) {
  const checklist = getCaseInputChecklist(category)
  const inventory = files.map((file) => classifyFrontendDocument(file))
  const availableTypes = new Set(inventory.map((item) => item.detectedType))

  const availableDocuments = checklist.required.filter((item) => availableTypes.has(item.type))
  const missingDocuments = checklist.required.filter((item) => !availableTypes.has(item.type))
  const optionalDocuments = checklist.optional.map((item) => ({
    ...item,
    status: availableTypes.has(item.type) ? 'available' : 'optional',
  }))

  const coverageScore = checklist.required.length
    ? availableDocuments.length / checklist.required.length
    : 0
  const optionalCoverage = checklist.optional.length
    ? optionalDocuments.filter((item) => item.status === 'available').length / checklist.optional.length
    : 0
  const confidenceScore = inventory.length
    ? inventory.reduce((sum, item) => sum + item.confidence, 0) / inventory.length
    : 0

  const completenessScore = Math.round((coverageScore * 0.75 + optionalCoverage * 0.1 + confidenceScore * 0.15) * 100)
  const readinessStatus =
    files.length === 0
      ? 'DESCRIPTION_ONLY'
      : completenessScore >= 75
        ? 'READY'
        : completenessScore >= 45
          ? 'PARTIAL' 
          : 'NOT_READY'

  const reliabilityNotes =
    files.length === 0
      ? [
          'No documents uploaded yet. JurisMind can still analyze the case from your description.',
          'The system will suggest the most helpful documents and evidence to collect next.',
        ]
      : [
          missingDocuments.length
            ? `Missing ${missingDocuments.length} likely required document(s).`
            : 'No obvious required-document gaps detected from the current checklist.',
          inventory.some((item) => !item.usableForAnalysis)
            ? 'Some uploaded files may be weak or unclear for deeper analysis.'
            : 'Current files look usable at an initial intake level.',
        ]

  return {
    checklist,
    inventory,
    availableDocuments,
    missingDocuments,
    optionalDocuments,
    completenessScore,
    readinessStatus,
    readinessLabel: readinessStatus.replace('_', ' '),
    reliabilityNotes,
  }
}

function normalizeChecklistItems(entries?: DocumentChecklistEntry[]) {
  return (entries || []).map((entry) => ({
    type: entry.type,
    label: entry.label,
    description: entry.description,
  }))
}

function normalizeStoredInventory(entries?: EvidenceInventoryEntry[]): FrontendDocumentInventoryItem[] {
  return (entries || []).map((entry) => ({
    id: entry.id,
    name: entry.file_name,
    detectedType: entry.detected_type,
    detectedCategory: entry.category,
    description: entry.basic_description,
    confidence: entry.confidence,
    reliabilityLabel: entry.reliability_label,
    inventoryStatus: (entry.inventory_status as FrontendDocumentInventoryItem['inventoryStatus']) || 'unclassified',
    usableForAnalysis: Boolean(entry.usable_for_analysis),
    sizeBytes: entry.size_bytes,
  }))
}

export function buildStoredDocumentPreview(payload: DocumentIntelligencePayload) {
  const availableDocuments = normalizeChecklistItems(payload.available_documents)
  const missingDocuments = normalizeChecklistItems(payload.missing_documents)
  const optionalDocuments = (payload.optional_documents || []).map((entry) => ({
    type: entry.type,
    label: entry.label,
    description: entry.description,
    status: entry.status || 'optional',
  }))
  const inventory = normalizeStoredInventory(payload.evidence_inventory)
  const checklist = {
    required: normalizeChecklistItems(payload.checklist?.required),
    optional: normalizeChecklistItems(payload.checklist?.optional),
  }

  const completenessScore = Math.max(0, Math.min(100, Number(payload.completeness_score || 0)))
  const readinessStatus = payload.readiness_status || payload.readiness_assessment?.label || 'DESCRIPTION_ONLY'
  const reliabilityNotes =
    payload.initial_reliability_notes && payload.initial_reliability_notes.length > 0
      ? payload.initial_reliability_notes
      : payload.completeness_explanation
        ? [payload.completeness_explanation]
        : ['Document intelligence is available, but no reliability notes were provided.']

  return {
    checklist,
    inventory,
    availableDocuments,
    missingDocuments,
    optionalDocuments,
    completenessScore,
    readinessStatus,
    readinessLabel: readinessStatus.replace(/_/g, ' '),
    reliabilityNotes,
  }
}

export function buildAnalyzePayloadDocuments(files: File[]): NonNullable<AnalyzeCasePayload['evidence']> {
  return files.map((file) => ({
    name: file.name,
    size: file.size,
    type: file.type || 'application/octet-stream',
  }))
}
