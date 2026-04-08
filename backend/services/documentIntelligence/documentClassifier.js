const documentRules = [
  {
    type: 'lease-agreement',
    category: 'agreement',
    keywords: ['lease', 'rental', 'tenancy', 'rent agreement'],
    reliability: 'high',
  },
  {
    type: 'employment-contract',
    category: 'agreement',
    keywords: ['employment', 'offer letter', 'appointment', 'hr letter'],
    reliability: 'high',
  },
  {
    type: 'contract-copy',
    category: 'agreement',
    keywords: ['contract', 'agreement', 'msa', 'work order', 'purchase order'],
    reliability: 'high',
  },
  {
    type: 'payment-proof',
    category: 'financial-record',
    keywords: ['payment', 'receipt', 'bank', 'transaction', 'utr', 'transfer'],
    reliability: 'high',
  },
  {
    type: 'salary-record',
    category: 'financial-record',
    keywords: ['salary', 'payslip', 'pay slip', 'payroll', 'compensation'],
    reliability: 'high',
  },
  {
    type: 'invoice-record',
    category: 'financial-record',
    keywords: ['invoice', 'bill', 'billing', 'statement'],
    reliability: 'high',
  },
  {
    type: 'purchase-proof',
    category: 'financial-record',
    keywords: ['purchase', 'order', 'receipt', 'invoice'],
    reliability: 'high',
  },
  {
    type: 'notice-letter',
    category: 'formal-notice',
    keywords: ['notice', 'demand', 'legal notice', 'eviction'],
    reliability: 'medium',
  },
  {
    type: 'termination-letter',
    category: 'formal-notice',
    keywords: ['termination', 'warning', 'show cause', 'disciplinary'],
    reliability: 'medium',
  },
  {
    type: 'breach-notice',
    category: 'formal-notice',
    keywords: ['breach', 'default', 'non performance', 'failure notice'],
    reliability: 'medium',
  },
  {
    type: 'complaint-record',
    category: 'communication',
    keywords: ['complaint', 'grievance', 'ticket', 'support'],
    reliability: 'medium',
  },
  {
    type: 'email-thread',
    category: 'communication',
    keywords: ['email', 'mail', 'chat', 'whatsapp', 'conversation'],
    reliability: 'medium',
  },
  {
    type: 'identity-proof',
    category: 'identity-record',
    keywords: ['aadhaar', 'aadhar', 'passport', 'pan', 'identity', 'id proof'],
    reliability: 'high',
  },
  {
    type: 'property-photos',
    category: 'visual-proof',
    keywords: ['photo', 'image', 'damage', 'property', 'room'],
    reliability: 'medium',
  },
  {
    type: 'photo-proof',
    category: 'visual-proof',
    keywords: ['photo', 'screenshot', 'image', 'screen'],
    reliability: 'medium',
  },
  {
    type: 'inspection-report',
    category: 'third-party-record',
    keywords: ['inspection', 'report', 'maintenance', 'assessment'],
    reliability: 'medium',
  },
  {
    type: 'primary-fact-record',
    category: 'supporting-record',
    keywords: ['statement', 'summary', 'chronology', 'timeline', 'facts'],
    reliability: 'medium',
  },
]

function normalize(value) {
  return String(value || '').trim().toLowerCase()
}

function scoreRule(rule, haystack, mimeType) {
  let score = 0
  for (const keyword of rule.keywords) {
    if (haystack.includes(keyword)) {
      score += keyword.length > 6 ? 3 : 2
    }
  }

  if (mimeType.includes('image') && rule.category === 'visual-proof') score += 2
  if (mimeType.includes('pdf') && ['agreement', 'formal-notice', 'third-party-record'].includes(rule.category)) {
    score += 1
  }
  if (mimeType.includes('word') && rule.category === 'communication') score += 1

  return score
}

function deriveInventoryStatus(bestScore) {
  if (bestScore >= 5) return 'confirmed'
  if (bestScore >= 2) return 'likely'
  return 'unclassified'
}

function deriveReliabilityLabel(mimeType, bestRule) {
  if (bestRule?.reliability === 'high' && !mimeType.startsWith('image/')) {
    return 'document-backed'
  }
  if (mimeType.startsWith('image/')) {
    return 'visual-support'
  }
  if (bestRule) {
    return 'supporting-record'
  }
  return 'uncertain-source'
}

export function classifyDocument(file = {}) {
  const fileName = normalize(file.name)
  const mimeType = normalize(file.type || 'application/octet-stream')
  const extension = fileName.includes('.') ? fileName.split('.').pop() : ''
  const haystack = `${fileName} ${mimeType} ${extension}`

  let bestRule = null
  let bestScore = 0

  for (const rule of documentRules) {
    const score = scoreRule(rule, haystack, mimeType)
    if (score > bestScore) {
      bestRule = rule
      bestScore = score
    }
  }

  return {
    id: `${file.name || 'document'}-${file.size || 0}`,
    originalName: file.name || 'Unnamed document',
    mimeType: file.type || 'application/octet-stream',
    sizeBytes: Number(file.size || 0),
    detectedType: bestRule?.type || 'unclassified-document',
    detectedCategory: bestRule?.category || 'uncategorized',
    description: bestRule
      ? `Likely ${bestRule.type.replace(/-/g, ' ')} based on file name and format.`
      : 'Could not confidently map this file to a known legal document type.',
    confidence: Math.min(0.95, Number((bestScore >= 5 ? 0.88 : bestScore >= 2 ? 0.66 : 0.34).toFixed(2))),
    availabilityStatus: 'available',
    inventoryStatus: deriveInventoryStatus(bestScore),
    reliabilityLabel: deriveReliabilityLabel(mimeType, bestRule),
    usableForAnalysis: bestScore >= 2 || mimeType === 'application/pdf' || mimeType.startsWith('image/'),
    classifierSource: bestRule ? 'rule-based' : 'fallback',
  }
}
